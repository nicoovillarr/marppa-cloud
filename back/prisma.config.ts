import * as dotenv from 'dotenv';
import { defineConfig } from "prisma/config";

const env = process.env.NODE_ENV;
const envFilePath =
  env == null || env === 'development'
    ? '.env'
    : `.env.${env}`;

dotenv.config({ path: envFilePath });

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
