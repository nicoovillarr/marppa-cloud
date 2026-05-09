import { AppContainer } from '@/app/container';
import { ILogger } from '@/shared/infrastructure/logger/ILogger';

interface LifecycleModule {
  start?(): Promise<void> | void;
  stop?(): Promise<void> | void;
}

async function main(): Promise<void> {
  const { container, modules } = AppContainer.build();
  const logger = container.resolve<ILogger>(AppContainer.tokenKey(ILogger));
  const lifecycle = modules as LifecycleModule[];

  for (const mod of lifecycle) {
    await mod.start?.();
  }

  logger.info('[Main] Infrastructure event worker is running.');

  const shutdown = async (signal: string) => {
    logger.info(`[Main] Received ${signal}. Shutting down...`);

    for (const mod of [...lifecycle].reverse()) {
      await mod.stop?.();
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
