import test from 'node:test';
import assert from 'node:assert/strict';
import { EventResourceRole, EventType, ResourceStatus } from '@marppa-cloud/db';
import { AbortError } from '@/event/domain/errors/AbortError';
import { EventWorker } from '@/event/application/EventWorker';
import { LinuxOrbitService } from '@/orbit/infrastructure/services/LinuxOrbitService';
import { LinuxHiveService } from '@/worker/infrastructure/LinuxHiveService';
import { WorkerStartProcessor } from '@/worker/application/WorkerStartProcessor';
import { Command } from '@/libs/Command';

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

  await (worker as any).process({ data: { eventId: 42 } });

  assert.equal(markFailedCalls, 1);
  assert.equal(incrementRetryCalls, 0);
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

  await (worker as any).process({ data: { eventId: 48 } });

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
