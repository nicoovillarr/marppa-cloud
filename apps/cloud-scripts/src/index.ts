import type { Application } from './app/Application';
import { buildContainer } from './app/container';

async function main(): Promise<void> {
  const container = buildContainer();
  const application = container.resolve<Application>('application');

  await application.start();
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
