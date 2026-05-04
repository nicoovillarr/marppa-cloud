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
});
