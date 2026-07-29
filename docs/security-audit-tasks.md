# Tasks — Security Audit

Derived from the exhaustive audit on 2026-07-28. `[○]` pending, `[✓]` done.

## Immediate (1-2 days)

- [✓] Ownership guard on Worker/Zone/Atom/Portal controllers (IDOR)
- [✓] Ownership/hierarchy in Company and User controllers
- [✓] Origin/Referer check on mutations (quick CSRF mitigation)
- [✓] Fail-closed `TURNSTILE_SECRET` in production
- [✓] Rotate/invalidate the old session in `tick()` (refresh token reuse)
- [✓] `forbidNonWhitelisted: true` in ValidationPipe

## Short term (1-2 weeks)

- [✓] Global rate limiting + login lockout (`@nestjs/throttler`)
- [✓] Full security headers on the frontend (CSP, HSTS, X-Frame-Options, Permissions-Policy)
- [✓] `helmet()` in NestJS
- [✓] Next.js middleware with a real session-cookie check
- [✓] `SAFE_WORKER_ID` regex in `LinuxHiveService.createWorker`
- [✓] Explicit Argon2 parameters (`argon2id`, memoryCost, timeCost, parallelism)
- [✓] Bound-check port/protocol in `NodeUpdateFiberProcessor`
- [✓] Review `AllExceptionsFilter` to avoid leaking internal error messages

## Medium term (1-2 months)

- [○] Real RBAC (owner/member roles per Company)
- [○] Full CSRF token (double-submit) replacing the Origin mitigation
- [✓] Second confirmation barrier for `SYSTEM_RESET_HARD`
- [✓] Align the major version of `jose` between back and cloud-scripts
- [✓] Add `aud`/`iss` claims to JWTs and verify them at every consumer
- [✓] Integrate `npm audit`/`osv-scanner` into CI
- [✓] Remove or harden `companyId`/`createdBy` in `CreateEventDto`

## Long term (architecture)

- [○] Dedicated HMAC secret for the Backend↔Cloud Scripts queueing flow (independent of `JWT_SECRET`)
- [○] Traceability/audit: record `actorUserId` + IP on every `Event`, immutable audit view
- [○] Centralized authorization policy layer (CASL/OPA) instead of checks scattered across controllers
- [○] Rate-limit event queueing per `companyId`
- [○] Validate at boot that `REDIS_URL` uses TLS + password in production (fail-closed)
- [○] Network segmentation (VLAN/DMZ) for the final production environment — infrastructure, non-blocking

## Cleanup / dead code

- [✓] Finish implementing or remove `AuthCache.isUserAdmin()/setIsUserAdmin()` (security dead code)
