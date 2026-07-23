import * as dotenv from 'dotenv';
import { defineConfig } from "prisma/config";

const env = process.env.NODE_ENV ?? 'development';

dotenv.config({
  path: [
    `.env.${env}.local`,
    '.env.local',
    `.env.${env}`,
    '.env',
  ],
});

export default defineConfig({
  schema: "../../packages/db/prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  // Same migration history as the backend: without this path a
  // `prisma migrate deploy` run from here would find no migrations and exit
  // successfully against an un-migrated database.
  migrations: {
    path: "../../packages/db/prisma/migrations",
  },
});
