import {
  AppContainer,
  isOnModuleDestroy,
  isOnModuleInit,
} from '@/libs/Container';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { HostPreflightService } from '@/system/infrastructure/services/HostPreflightService';
import { configDotenv } from 'dotenv';

interface LifecycleModule {
  start?(): Promise<void> | void;
  stop?(): Promise<void> | void;
}

const NODE_ENV = process.env.NODE_ENV ?? 'development';

configDotenv({
  path: [
    `.env.${NODE_ENV}.local`,
    '.env.local',
    `.env.${NODE_ENV}`,
    '.env',
  ],
});

async function main(): Promise<void> {
  const { container, modules, lifecycleProviders } = AppContainer.build();
  const logger = container.resolve<LoggerService>(
    AppContainer.tokenKey(LoggerService),
  );
  const lifecycle = modules as LifecycleModule[];

  // The host must be ready before any event is consumed: a half-configured host
  // would otherwise fail mid-way through a zone/VM creation and leave state
  // behind. Throwing here aborts startup with the remediation list.
  await container
    .resolve<HostPreflightService>(AppContainer.tokenKey(HostPreflightService))
    .run();

  for (const provider of lifecycleProviders) {
    if (isOnModuleInit(provider)) await provider.onModuleInit();
  }

  for (const mod of lifecycle) {
    await mod.start?.();
  }

  logger.info('[Main] Infrastructure event worker is running.');

  const shutdown = async (signal: string) => {
    logger.info(`[Main] Received ${signal}. Shutting down...`);

    for (const mod of [...lifecycle].reverse()) {
      await mod.stop?.();
    }

    for (const provider of [...lifecycleProviders].reverse()) {
      if (isOnModuleDestroy(provider)) await provider.onModuleDestroy();
    }

    logger.info('[Main] Shutdown complete.');

    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
