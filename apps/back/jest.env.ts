import { config } from 'dotenv';

// Mirror the ConfigModule envFilePath cascade from src/app.module.ts so that
// specs instantiating PrismaService directly get the same DATABASE_URL.
// Jest forces NODE_ENV=test; there are no .env.test.* files, so fall back to
// development unless another env (e.g. production via test:prod) was set.
const nodeEnv = process.env.NODE_ENV;
const env = !nodeEnv || nodeEnv === 'test' ? 'development' : nodeEnv;

for (const file of [`.env.${env}.local`, '.env.local', `.env.${env}`, '.env']) {
  config({ path: file });
}
