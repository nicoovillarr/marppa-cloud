import * as dotenv from 'dotenv';

const env = process.env.NODE_ENV;
const envFilePath =
  env === 'development'
    ? '.env'
    : `.env.${env}`;

dotenv.config({ path: envFilePath });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
