# Code Review — cloud-scripts

Infrastructure-critical TypeScript backend managing KVM VMs, nftables, dnsmasq, and nginx via event sourcing + BullMQ.

---

## Security

### [x] [CRITICAL] Shell injection via `bash -c` string interpolation — LinuxHiveService

**File:** `src/modules/worker/infrastructure/LinuxHiveService.ts`  
**Lines:** ~568–574, ~597–602, ~691–695

Three methods pass `vmName` (and other params) directly into a `bash -c` string, bypassing `Command.runCommand`'s safe argument array:

```typescript
// testWorkerLogin
await Command.runCommand('bash', ['-c', `virsh console ${vmName} --force ...`]);

// checkCloudInitStatus
await Command.runCommand('bash', ['-c', `virsh console ${vmName} ...`]);

// diagnoseWorkerNetwork
await Command.runCommand('bash', ['-c', `virsh domiflist ${vmName} ...`]);
```

`validateVmName()` exists but the `bash -c` wrapper re-introduces injection regardless. A vmName like `foo; rm -rf /` executes as shell.

**Fix:** Pass each argument as a separate array element, never concatenate into `bash -c`:

```typescript
await Command.runCommand('virsh', ['console', vmName, '--force', ...]);
```

If a pipeline is unavoidable, validate strictly and use a whitelist regex before `bash -c`.

---

### [x] [CRITICAL] Nginx config injection via unvalidated DB fields — LinuxOrbitService

**File:** `src/modules/orbit/infrastructure/services/LinuxOrbitService.ts`  
**Lines:** `buildLocationBlock` / `renderNginxBlock`

DB fields written directly into nginx config text:

```typescript
proxy_pass: `http://${ip}:${t.port}`          // ip = customIPAddress from DB
ssl_certificate: portal.sslCertificate        // path from DB
add_header / proxy_set_header                 // DB JSON keys+values
```

A newline in any field breaks nginx config syntax and allows injecting arbitrary directives. A crafted `customIPAddress` or `sslCertificate` value could redirect traffic or serve attacker-controlled certs.

**Fix:** Sanitize every field before interpolation:

```typescript
function sanitizeNginxValue(val: string): string {
  if (/[\n\r;{}]/.test(val)) throw new Error(`Invalid nginx value: ${val}`);
  return val;
}

// IP: validate with a proper regex or net.isIPv4()
// Port: parseInt and range-check
// Header names: /^[A-Za-z0-9_-]+$/
// Header values: no newlines
// File paths: no traversal, allowlist prefix
```

---

### [ ] [HIGH] Timing attack on bearer token comparison — HttpServer

**File:** `src/modules/shared/infrastructure/http/HttpServer.ts`  
**Line:** ~30

**Current status:** No `HttpServer.ts` exists in the current `apps/cloud-scripts` tree, so this item does not map to a live file in this revision.

```typescript
return token === AUTH_TOKEN;
```

String equality short-circuits on first mismatched byte, leaking token length/prefix via timing.

**Fix:**

```typescript
import { timingSafeEqual } from 'crypto';

const a = Buffer.from(token);
const b = Buffer.from(AUTH_TOKEN);
if (a.length !== b.length) return false;
return timingSafeEqual(a, b);
```

---

### [x] [HIGH] WebSocket session confusion — second AUTH overwrites `userId`

**File:** `src/modules/shared/infrastructure/http/WebSocketServer.ts`  
**Line:** ~47

```typescript
socket.userId = payload.sub; // overwrites on every AUTH message
```

Auth check at line ~70 only tests `if (socket.userId)`. A client can send a second AUTH with a different token and silently adopt a different identity on an open connection.

**Fix:** Reject AUTH if already authenticated:

```typescript
if (socket.userId) {
  socket.close(4001, 'Already authenticated');
  return;
}
```

---

### [x] [HIGH] `validateVmName` not called before shell commands in stopWorker / startWorker / deleteWorker

**File:** `src/modules/worker/infrastructure/LinuxHiveService.ts`

These three methods pass `vmName` to `Command.runCommand` as a separate arg (safe from shell injection) but do **not** call `validateVmName()`. A malformed VM name passes through to virsh unvalidated.

**Fix:** Call `validateVmName(vmName)` at the top of every public method that uses it.

---

### [x] [MEDIUM] No JWT algorithm pin — WebSocket auth accepts any `alg`

**File:** `src/modules/shared/infrastructure/http/WebSocketServer.ts`

`jose.jwtVerify` without an `algorithms` option accepts any algorithm including `none` if a malformed library were swapped in.

**Fix:**

```typescript
await jwtVerify(token, secret, { algorithms: ['HS256'] });
```

---

### [x] [MEDIUM] `USERNAME` env var flows into `chown` shell arg — LinuxHiveService

**File:** `src/modules/worker/infrastructure/LinuxHiveService.ts`  
**Line:** ~130

```typescript
await Command.runCommand('chown', ['-R', `${process.env.USERNAME}:...`, path]);
```

`USERNAME` is operator-controlled at deploy time (low risk) but is never validated. An empty or special-character value could corrupt the chown call.

**Fix:** Validate at startup: `/^[a-z_][a-z0-9_-]{0,31}$/`.

---

### [x] [LOW] `REDIS_URL` unvalidated — silent fallback to localhost

**File:** `src/modules/shared/infrastructure/services/RedisService.ts`  
**Line:** 12

If `REDIS_URL` is undefined, `new Redis(undefined, ...)` silently connects to `127.0.0.1:6379`. In production this would silently process no real events.

**Fix:** Assert at startup:

```typescript
if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required');
```

---

## Error Handling & Reliability

### [x] [HIGH] AbortError path leaves event stuck in limbo — EventWorker

**File:** `src/modules/event/application/EventWorker.ts`  
**Line:** ~118

```typescript
try {
  // ... inner: create failure event (can throw)
} catch (innerErr) {
  this.logger.error(...);
}
await this.eventRepo.markFailed(eventId); // OUTSIDE inner try-catch
```

If the inner failure-event creation throws (e.g. DB down), execution still reaches `markFailed`. But if `markFailed` itself throws, the event is never marked failed and will be retried forever or silently dropped depending on BullMQ config.

**Fix:** Wrap both calls:

```typescript
try {
  await createFailureEvent(...);
  await this.eventRepo.markFailed(eventId);
} catch (innerErr) {
  this.logger.error('Failed to record event failure', innerErr);
}
```

---

### [x] [HIGH] Non-AbortError failures never write `failedAt` to DB

**File:** `src/modules/event/application/EventWorker.ts`

For non-AbortErrors the worker calls `incrementRetry` and rethrows (letting BullMQ retry), but never calls `markFailed`. After all retries are exhausted the event row has no `failedAt` timestamp — monitoring queries relying on that field will miss it.

**Fix:** On the BullMQ `failed` event listener, call `markFailed` when retries are exhausted:

```typescript
worker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= MAX_RETRIES) {
    await this.eventRepo.markFailed(job.data.eventId);
  }
  this.logger.error(...);
});
```

---

### [x] [HIGH] `deleteNftablesConfig` swallows all errors silently — LinuxMeshService

**File:** `src/modules/mesh/infrastructure/services/LinuxMeshService.ts`  
**Line:** ~256

```typescript
try {
  await fs.unlink(configPath);
} catch (_) {
  // silent
}
```

A permission error or full disk won't surface. The nftables config file remains, and subsequent zone setup may apply stale or conflicting rules.

**Fix:** At minimum log the error. Rethrow if the file's non-existence is the only acceptable failure:

```typescript
} catch (err: any) {
  if (err.code !== 'ENOENT') throw err;
}
```

---

### [x] [HIGH] WorkerStartProcessor marks VM ACTIVE even when unreachable

**File:** `src/modules/worker/application/WorkerStartProcessor.ts`  
**Line:** ~197

```typescript
await updateWorkerStatus(ResourceStatus.ACTIVE); // unconditional
```

Called after a `testWorkerLogin` check but outside any success branch. If the login test fails or times out, the VM is still marked ACTIVE in the DB.

**Fix:** Gate status update on confirmed connectivity:

```typescript
if (isConnected) {
  await updateWorkerStatus(ResourceStatus.ACTIVE);
} else {
  await updateWorkerStatus(ResourceStatus.ERROR);
  throw new AbortError('VM unreachable after start');
}
```

---

### [x] [MEDIUM] Log file never starts on fresh install — LoggerService

**File:** `src/modules/shared/infrastructure/services/LoggerService.ts`

```typescript
shouldLogFile(): boolean {
  return fs.existsSync(this.logFile); // false on new install
}
```

On a fresh machine the file doesn't exist → `shouldLogFile` returns false → log file is never created → all file logging silently dropped.

**Fix:** Create the file (or its directory) at startup if it doesn't exist, then set the flag:

```typescript
fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
fs.writeFileSync(this.logFile, '', { flag: 'a' }); // create if not exist
```

---

### [x] [LOW] `parseInt(MAX_LOG_SIZE)` returns NaN → log rotation never triggers

**File:** `src/modules/shared/infrastructure/services/LoggerService.ts`

If `MAX_LOG_SIZE` env var is absent or non-numeric, `parseInt` returns `NaN`. Any size comparison with `NaN` is false, so rotation never runs and the log file grows unbounded.

**Fix:**

```typescript
const maxSize = parseInt(process.env.MAX_LOG_SIZE ?? '', 10);
if (isNaN(maxSize)) throw new Error('MAX_LOG_SIZE must be a number');
```

---

## Architecture & Design

### [ ] [HIGH] `"strict": false` — entire codebase lacks type safety

**File:** `tsconfig.json`

`strict: false` disables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, etc. In a codebase that provisions real VMs, firewall rules, and DNS, a `null` dereference or wrong-type argument silently passes type checking.

**Fix:** Enable incrementally:

```json
{
  "compilerOptions": {
    "strict": true,
    "useUnknownInCatchVariables": true
  }
}
```

Fix resulting errors file-by-file, starting with security-critical modules.

---

### [MEDIUM] All LinuxMeshService method parameters are implicit `any`

**File:** `src/modules/mesh/infrastructure/services/LinuxMeshService.ts`

With `strict: false`, all method parameters lack type annotations and compile as `any`. Callers can pass incorrect types silently.

**Fix:** Annotate all parameters. Blocked by the `strict: false` issue above — fix together.

---

### [MEDIUM] `ProcessorRegistry` constructed outside DI container

**File:** `src/app/container.ts`  
**Line:** ~396

```typescript
const registry = new ProcessorRegistry(); // bypasses DI
```

Constructed with `new` before the container resolves dependencies. If `ProcessorRegistry` ever gains constructor dependencies this silently breaks with a confusing error.

**Fix:** Register it as a normal scoped value in Awilix and resolve it like other services.

---

## Operational Risks

### [x] [HIGH] nftables rules duplicated on every `saveNftConfiguration` / `deleteNftablesConfig` saves without validation — LinuxMeshService

**File:** `src/modules/mesh/infrastructure/services/LinuxMeshService.ts`

Sequence on save:
1. `nft add rule` — applies rules live
2. `nft list ruleset` → write to file
3. `nft -f file` — re-applies file, duplicating every rule

On a busy node (frequent zone changes), rules accumulate. Firewall behavior becomes unpredictable; eventual `nft list` output explodes.

**Fix:** Either write rules to file first and apply once with `nft -f`, or use `nft flush ruleset` before re-applying. Never both add-live and reload-from-file in the same operation.

---

### [x] [MEDIUM] Hardcoded `~/nftables.conf` path in `forceResetMesh`

**File:** `src/modules/mesh/infrastructure/services/LinuxMeshService.ts`  
**Line:** ~739

`~` expands to the home directory of the running process user. On a system daemon this may not be `/root` or the expected path, silently reading/writing the wrong file.

**Fix:** Use an absolute path from config/env, same as the rest of the service.

---

### [MEDIUM] Hardcoded `setTimeout` delays block the BullMQ queue — WorkerStartProcessor

**File:** `src/modules/worker/application/WorkerStartProcessor.ts`

Multiple `await sleep(5000)` / `await sleep(3000)` calls inside the processor. With `concurrency=1`, these block all other events for up to ~20 seconds per VM start.

**Fix:** Move polling/waiting logic out of the queue processor into a separate background checker, or use a delayed BullMQ job to re-check state instead of sleeping inline.

---

### [LOW] `findNextPort` uses `Math.random()` — fragile under concurrent callers

**File:** `src/modules/mesh/infrastructure/services/LinuxMeshService.ts`

Safe today because `concurrency=1`, but the function's correctness silently depends on that constraint. If concurrency ever increases, two processors can pick the same port.

**Fix:** Use an atomic port counter in Redis, or query the DB for the max allocated port and increment.

---

## Code Quality & Maintainability

### [x] [MEDIUM] WorkerCreateProcessor broadcasts full VM object including MAC address

**File:** `src/modules/worker/application/WorkerCreateProcessor.ts`  
**Line:** ~99

```typescript
sendWorkerMessage(worker, 'CREATED', worker); // full WorkerWithImageAndFlavor
```

Broadcasts `macAddress`, `workerImage`, `workerFlavor`, and other internal fields to all subscribed WebSocket clients. MAC addresses are network-sensitive and should not be in client-facing events.

**Fix:** Project a safe DTO:

```typescript
const { id, name, status, zoneId, companyId } = worker;
sendWorkerMessage(worker, 'CREATED', { id, name, status, zoneId, companyId });
```

---

### [x] [LOW] `loop()` called without `await` in multiple processors

**Files:**  
- `src/modules/system/application/DeleteProcessor.ts` ~65  
- `src/modules/system/application/IPChecker.ts`  
- `src/modules/system/application/LeaseReader.ts`

```typescript
public onModuleInit(): void {
  this.loop(); // fire-and-forget, unhandled rejection
}
```

Unhandled rejections from the loop body won't crash the process (Node swallows them by default) but will disappear silently.

**Fix:**

```typescript
public onModuleInit(): void {
  this.loop().catch((err) => this.logger.error('Loop crashed', err));
}
```

---

### [LOW] IP regex in HttpServer allows octets > 255

**File:** `src/modules/shared/infrastructure/http/HttpServer.ts`

The IP validation regex matches patterns like `999.999.999.999` as valid.

**Fix:** Use `net.isIPv4(ip)` from Node's built-in `net` module instead of a hand-rolled regex.

---

## Testing Gaps

### [x] [HIGH] Zero automated tests

No test files found in the repository. This codebase:
- Executes privileged Linux commands (`virsh`, `nft`, `guestfish`)
- Manages real network infrastructure
- Has multiple subtle control-flow bugs (documented above)

Without tests, regressions in security-critical paths go undetected.

**Recommended test coverage (priority order):**

1. `EventWorker` — error paths, AbortError handling, retry/markFailed logic
2. `LinuxHiveService.validateVmName` — injection payloads, edge cases
3. `LinuxOrbitService.buildLocationBlock` — injection payloads in all DB-sourced fields
4. `LinuxMeshService.saveNftConfiguration` — verify no duplicate rule application
5. `WorkerStartProcessor` — ACTIVE/ERROR status branching based on connectivity

Use `StubHiveService` / `StubMeshService` as baselines for processor unit tests.

---

## Top-10 Priority Action List

| # | Severity | File | Action |
|---|----------|------|--------|
| 1 | CRITICAL | `LinuxHiveService.ts` | Remove all `bash -c` string interpolation; use arg arrays |
| 2 | CRITICAL | `LinuxOrbitService.ts` | Sanitize every DB field before writing to nginx config |
| 3 | HIGH | `tsconfig.json` | Enable `strict: true`; fix resulting errors iteratively |
| 4 | HIGH | `EventWorker.ts` | Fix AbortError path: wrap both failure-event + markFailed in one try/catch |
| 5 | HIGH | `EventWorker.ts` | Write `failedAt` on non-AbortError after retries exhausted (BullMQ `failed` listener) |
| 6 | HIGH | `WorkerStartProcessor.ts` | Gate `ACTIVE` status on confirmed SSH connectivity; throw AbortError on failure |
| 7 | HIGH | `LinuxMeshService.ts` | Fix nftables rule duplication: apply rules once, don't add-live then reload-file |
| 8 | HIGH | `LinuxMeshService.ts` | Rethrow (or at least log) errors in `deleteNftablesConfig` |
| 9 | HIGH | `HttpServer.ts` | Replace `===` token comparison with `timingSafeEqual` |
| 10 | HIGH | `LinuxHiveService.ts` | Call `validateVmName` at top of every method that uses vmName |
