import test from 'node:test';
import assert from 'node:assert/strict';
import { EventResourceRole, EventType, ResourceStatus } from '@marppa-cloud/db';
import { AbortError } from '@/event/domain/errors/AbortError';
import { EventWorker } from '@/event/application/EventWorker';
import { LinuxOrbitService } from '@/orbit/infrastructure/services/LinuxOrbitService';
import { LinuxHiveService } from '@/worker/infrastructure/LinuxHiveService';
import { WorkerStartProcessor } from '@/worker/application/WorkerStartProcessor';
import { Command } from '@/libs/Command';
import { isValidSshPublicKey, eventJobId, signEventJob } from '@marppa-cloud/shared';
import { AppContainer } from '@/libs/Container';
import { IPChecker } from '@/system/application/IPChecker';

process.env.EVENT_QUEUE_HMAC_SECRET ??= 'test-event-queue-hmac-secret';
const testEventSignature = (eventId: number) =>
  signEventJob(eventId, process.env.EVENT_QUEUE_HMAC_SECRET!);

test('EventWorker marks aborted events as failed', async () => {
  let markFailedCalls = 0;
  let incrementRetryCalls = 0;

  const repository = {
    findById: async () =>
      ({
        id: 42,
        type: EventType.WORKER_START,
        createdBy: 'u-1',
        companyId: 'c-1',
        processedAt: null,
        failedAt: null,
        resources: [
          {
            resourceType: 'Worker',
            resourceId: 'w-1',
            role: EventResourceRole.PRIMARY,
          },
        ],
        properties: [],
      }) as any,
    markProcessed: async () => undefined,
    markFailed: async () => {
      markFailedCalls += 1;
    },
    incrementRetry: async () => {
      incrementRetryCalls += 1;
    },
    createEvent: async () => 1,
    addEventResource: async () => undefined,
  };

  const registry = {
    resolve: () => ({
      handle: async () => {
        throw new AbortError('stop processing');
      },
    }),
  };

  const logger = {
    info: () => undefined,
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const parentState = {
    classify: async () => ({ kind: 'ready', status: ResourceStatus.ACTIVE }),
  };

  const worker = new EventWorker(
    {} as any,
    registry as any,
    logger as any,
    parentState as any,
    repository as any,
  );

  await (worker as any).process({
    data: { eventId: 42, signature: testEventSignature(42) },
  });

  assert.equal(markFailedCalls, 1);
  assert.equal(incrementRetryCalls, 0);
});

test('EventWorker drops a job with a missing or forged signature', async () => {
  let findByIdCalls = 0;

  const repository = {
    findById: async () => {
      findByIdCalls += 1;
      return {} as any;
    },
    markProcessed: async () => undefined,
    markFailed: async () => undefined,
    incrementRetry: async () => undefined,
    createEvent: async () => 1,
    addEventResource: async () => undefined,
  };

  const logger = {
    info: () => undefined,
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const worker = new EventWorker(
    {} as any,
    {} as any,
    logger as any,
    {} as any,
    repository as any,
  );

  await (worker as any).process({ data: { eventId: 42 } });
  await (worker as any).process({
    data: { eventId: 42, signature: 'not-the-real-signature' },
  });

  assert.equal(findByIdCalls, 0);
});

test('LinuxHiveService rejects invalid VM names before invoking virsh', async () => {
  const originalRunCommand = Command.runCommand;
  let runCommandCalls = 0;

  (Command as any).runCommand = async () => {
    runCommandCalls += 1;
    return '';
  };

  try {
    const service = new LinuxHiveService();
    await assert.rejects(() => service.startWorker('bad;name'));
    assert.equal(runCommandCalls, 0);
  } finally {
    (Command as any).runCommand = originalRunCommand;
  }
});

test('EventWorker accepts system events with no primary resource', async () => {
  let handled = 0;
  let markFailedCalls = 0;

  const repository = {
    findById: async () =>
      ({
        id: 48,
        type: EventType.SYSTEM_RESET,
        createdBy: 'u-1',
        companyId: 'c-1',
        processedAt: null,
        failedAt: null,
        resources: [],
        properties: [],
      }) as any,
    markProcessed: async () => undefined,
    markFailed: async () => {
      markFailedCalls += 1;
    },
    incrementRetry: async () => undefined,
    createEvent: async () => 1,
    addEventResource: async () => undefined,
  };

  const registry = {
    resolve: () => ({
      handle: async () => {
        handled += 1;
      },
    }),
  };

  const logger = {
    info: () => undefined,
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const worker = new EventWorker(
    {} as any,
    registry as any,
    logger as any,
    { classify: async () => ({ kind: 'ready' }) } as any,
    repository as any,
  );

  await (worker as any).process({
    data: { eventId: 48, signature: testEventSignature(48) },
  });

  assert.equal(handled, 1);
  assert.equal(markFailedCalls, 0);
});

test('LinuxOrbitService rejects injected proxy config values', () => {
  const service = new LinuxOrbitService({} as any);

  const transponder = {
    id: 't-1',
    path: '/app',
    port: 8080,
    priority: 1,
    status: ResourceStatus.ACTIVE,
    node: { ipAddress: '10.0.0.10' },
  };

  assert.throws(
    () =>
      (service as any).buildTransponderRoute({
        ...transponder,
        node: { ipAddress: '10.0.0.10\nrespond "pwned"' },
      }),
    /Invalid proxy target IP/,
  );

  assert.throws(
    () =>
      (service as any).buildTransponderRoute({
        ...transponder,
        path: '/app\n\t\trespond "pwned"',
      }),
    /Invalid route path/,
  );

  assert.throws(
    () => (service as any).buildTransponderRoute({ ...transponder, port: 99999 }),
    /Invalid proxy port/,
  );
});

test('WorkerStartProcessor does not mark unreachable workers as ACTIVE', async () => {
  // No boot budget: one connectivity attempt, then straight to diagnostics.
  process.env.WORKER_BOOT_TIMEOUT_MS = '0';

  const statusUpdates: string[] = [];

  const prisma = {
    worker: {
      findUnique: async () =>
        ({
          id: 'w-1',
          status: ResourceStatus.QUEUED,
          ownerId: 'owner-1',
          macAddress: '00:11:22:33:44:55',
          node: {
            ipAddress: '10.0.0.5',
            zoneId: 'z-1',
            status: ResourceStatus.ACTIVE,
          },
        }) as any,
      update: async ({ data }: { data: { status: ResourceStatus } }) => {
        statusUpdates.push(data.status);
      },
    },
  };

  const wsServer = {
    sendWorkerMessage: () => undefined,
  };

  const logger = {
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const repository = {
    createEvent: async () => 1,
    addEventResource: async () => undefined,
  };

  const hiveService = {
    startWorker: async () => undefined,
    getWorkerVnet: async () => 'vnet0',
    diagnoseWorkerNetwork: async () => ({
      vmRunning: true,
      vmInterfaces: [],
      vmHasInterface: true,
      vnetExists: true,
      vnetConnectedToBridge: true,
      vmConsoleAccessible: false,
      cloudInitComplete: false,
      dhcpRequestVisible: false,
    }),
    checkCloudInitStatus: async () => ({
      cloudInitExists: true,
      cloudInitComplete: false,
      networkConfigured: false,
      sshConfigured: false,
    }),
    testWorkerLogin: async () => false,
    forceStopWorker: async () => undefined,
  };

  const meshService = {
    linkVnetToBridge: async () => undefined,
    verifyWorkerConnectivity: async () => false,
    diagnoseBridgeConnectivity: async () => ({
      bridgeExists: true,
      bridgeUp: true,
      dhcpConfigExists: true,
      ipInDhcpRange: true,
      arpEntry: false,
      pingSuccessful: false,
    }),
    forceRenewDhcpLease: async () => false,
    fixVnetBridgeConnection: async () => false,
  };

  const processor = new WorkerStartProcessor(
    prisma as any,
    wsServer as any,
    logger as any,
    repository as any,
    hiveService as any,
    meshService as any,
  );

  const event = {
    id: 99,
    retries: 0,
    createdBy: 'u-1',
    companyId: 'c-1',
    resources: [{ resourceType: 'Worker', resourceId: 'w-1' }],
    properties: [],
  } as any;

  await assert.rejects(() => processor.handle(event), AbortError);
  assert.deepEqual(statusUpdates, [
    ResourceStatus.PROVISIONING,
    ResourceStatus.FAILED,
  ]);
});


test('Command kills a child that outlives its timeout', async () => {
  const started = Date.now();

  await assert.rejects(
    () => Command.runCommand('node', ['-e', 'setTimeout(() => {}, 60000)'], false, 300),
    /timed out after 300ms/,
  );

  assert.ok(
    Date.now() - started < 10000,
    'the timeout must settle the promise instead of waiting for the child',
  );
});

test('Command without a timeout still resolves normally', async () => {
  const output = await Command.runCommand('node', ['-e', 'process.stdout.write("ok")']);

  assert.equal(output, 'ok');
});

test('Command timeout does not fire for a command that finishes in time', async () => {
  const output = await Command.runCommand(
    'node',
    ['-e', 'process.stdout.write("fast")'],
    false,
    10000,
  );

  assert.equal(output, 'fast');
});


test('IPChecker constructor params all resolve to injectable tokens', () => {
  const tokens: unknown[] = (AppContainer as any)._resolveParamTokens(IPChecker);

  assert.ok(tokens.length > 0, 'IPChecker must declare its dependencies');

  // A primitive here means the container would look for a provider registered
  // under `Number`/`String` and blow up while building the graph.
  for (const token of tokens) {
    assert.ok(
      token !== Number && token !== String && token !== Boolean,
      `IPChecker has a primitive constructor param (${String(token)}); it cannot be injected`,
    );
  }
});


test('the shared SSH key rule accepts what the API accepts', () => {
  const body = 'AAAAB3NzaC1yc2EAAAADAQABAAABgQCv';

  assert.ok(isValidSshPublicKey(`ssh-rsa ${body}`), 'no comment');
  assert.ok(isValidSshPublicKey(`ssh-rsa ${body} nico@laptop`), 'plain comment');
  assert.ok(isValidSshPublicKey(`ssh-rsa ${body} mi notebook vieja`), 'comment with spaces');
  assert.ok(isValidSshPublicKey(`  ssh-ed25519 ${body}  `), 'surrounding whitespace');
  assert.ok(isValidSshPublicKey(`ecdsa-sha2-nistp521 ${body} x`), 'any ecdsa curve');

  assert.ok(!isValidSshPublicKey(`ssh-rsa ${body}
ssh-rsa ${body}`), 'embedded newline');
  assert.ok(!isValidSshPublicKey(`not-a-type ${body}`), 'unknown key type');
  assert.ok(!isValidSshPublicKey('ssh-rsa'), 'no body');
});

test('event job ids are never bare integers', () => {
  assert.equal(eventJobId(91), 'event-91');
  assert.ok(!/^\d+$/.test(eventJobId(91)), 'BullMQ rejects a fully numeric custom id');
});


test('a Caddy config Caddy rejects is rolled back instead of left behind', async () => {
  const service = new LinuxOrbitService({} as any);
  const writes: Array<{ path: string; content: string | null }> = [];

  (service as any).readCaddySite = async () => null;
  (service as any).writeRootFile = async (path: string, content: string) => {
    writes.push({ path, content });
  };
  (service as any).removeRootFile = async (path: string) => {
    writes.push({ path, content: null });
  };
  (service as any).reloadCaddy = async () => {
    throw new Error('ambiguous site definition: ws.cloud.marppa.com');
  };

  await assert.rejects(
    () =>
      service.generatePortalConfig({
        id: 'p-evil',
        address: 'ws.cloud.marppa.com',
        transponders: [],
      }),
    /ambiguous site definition/,
  );

  assert.equal(writes.length, 2, 'the file is written and then withdrawn');
  assert.equal(writes[1].content, null, 'a portal with no previous config leaves none');
});

test('a rejected update restores the previous Caddy config', async () => {
  const service = new LinuxOrbitService({} as any);
  const previous = ['old.marppa.com {', '}', ''].join('\n');
  const writes: Array<string | null> = [];

  (service as any).readCaddySite = async () => previous;
  (service as any).writeRootFile = async (_path: string, content: string) => {
    writes.push(content);
  };
  (service as any).removeRootFile = async () => {
    writes.push(null);
  };
  (service as any).reloadCaddy = async () => {
    throw new Error('rejected');
  };

  await assert.rejects(() =>
    service.generatePortalConfig({
      id: 'p-1',
      address: 'new.marppa.com',
      transponders: [],
    }),
  );

  assert.equal(writes[writes.length - 1], previous, 'the last write restores the old site');
});
