import { PASSWORD_HASHER_SYMBOL, PasswordHasher } from "@/user/domain/services/password-hasher.service";
import { UserModule } from "@/user/user.module";
import { NestFactory } from "@nestjs/core";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

import * as dotenv from 'dotenv';
import { ConnectionOptions } from "tls";

const env = process.env.NODE_ENV;
const envFilePath =
  env == null || env === 'development'
    ? '.env'
    : `.env.${env}`;

dotenv.config({ path: envFilePath });

const dbCARoute = process.env.DB_CA_ROUTE;
let ssl: ConnectionOptions | undefined;

if (dbCARoute) {
  const caPath = path.resolve(process.cwd(), dbCARoute);

  if (!fs.existsSync(caPath)) {
    throw new Error(`CA file not found at ${caPath}`);
  }

  ssl = {
    ca: fs.readFileSync(caPath).toString(),
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

const createCompany = async () => {
  console.log('Creating company...');

  const companyData = {
    id: "c-000001",
    name: "Marppa Cloud Solution",
    alias: "MCS",
    description: "MCS Root Company",
  };

  await prisma.company.upsert({
    where: {
      id: "c-000001",
    },
    create: companyData,
    update: companyData,
  });

  console.log("Company created successfully!");
}

const createUsers = async () => {
  console.log('Creating users...');

  const app = await NestFactory.createApplicationContext(UserModule, { logger: ['error', 'warn'] });

  const passwordHasher = app.get<PasswordHasher>(PASSWORD_HASHER_SYMBOL);

  const hash = await passwordHasher.hash('1234');

  const userData = {
    id: "u-000001",
    name: "ROOT",
    email: "nvillar@marppa.com",
    password: hash,
    company: {
      connect: {
        id: "c-000001",
      },
    },
  };

  await prisma.user.upsert({
    where: {
      id: "u-000001",
    },
    create: userData,
    update: userData,
  });

  console.log("Users created successfully!");

  await app.close();
};

const createWorkerFamilies = async () => {
  console.log('Creating worker families...');

  const families = [
    {
      name: 'zen',
      description: 'Balanced compute for general workloads',
      flavors: [
        { name: 'nano', cpuCores: 0.5, ramMB: 512, diskGB: 10 },
        { name: 'micro', cpuCores: 1, ramMB: 1024, diskGB: 20 },
        { name: 'small', cpuCores: 2, ramMB: 2048, diskGB: 40 },
        { name: 'medium', cpuCores: 4, ramMB: 4096, diskGB: 80 },
      ],
    },

    {
      name: 'spark',
      description: 'CPU optimized workers for compute-heavy tasks',
      flavors: [
        { name: 'small', cpuCores: 2, ramMB: 1024, diskGB: 20 },
        { name: 'medium', cpuCores: 4, ramMB: 2048, diskGB: 40 },
        { name: 'large', cpuCores: 8, ramMB: 4096, diskGB: 80 },
      ],
    },

    {
      name: 'vault',
      description: 'Memory optimized workers for caches and in-memory workloads',
      flavors: [
        { name: 'small', cpuCores: 1, ramMB: 4096, diskGB: 20 },
        { name: 'medium', cpuCores: 2, ramMB: 8192, diskGB: 40 },
        { name: 'large', cpuCores: 4, ramMB: 16384, diskGB: 80 },
      ],
    },

    {
      name: 'forge',
      description: 'Disk intensive workers for storage-heavy workloads',
      flavors: [
        { name: 'small', cpuCores: 1, ramMB: 2048, diskGB: 100 },
        { name: 'medium', cpuCores: 2, ramMB: 4096, diskGB: 250 },
        { name: 'large', cpuCores: 4, ramMB: 8192, diskGB: 500 },
      ],
    },

    {
      name: 'pulse',
      description: 'Lightweight workers for short-lived or background tasks',
      flavors: [
        { name: 'tiny', cpuCores: 0.25, ramMB: 256, diskGB: 5 },
        { name: 'nano', cpuCores: 0.5, ramMB: 512, diskGB: 10 },
        { name: 'micro', cpuCores: 1, ramMB: 1024, diskGB: 20 },
      ],
    },
  ];

  for (const family of families) {
    const upsertedFamily = await prisma.workerFamily.upsert({
      where: { name: family.name },
      create: {
        name: family.name,
        description: family.description,
      },
      update: {
        description: family.description,
      },
    });

    for (const flavor of family.flavors) {
      await prisma.workerFlavor.upsert({
        where: {
          familyId_name: {
            familyId: upsertedFamily.id,
            name: flavor.name,
          },
        },
        create: {
          name: flavor.name,
          cpuCores: flavor.cpuCores,
          ramMB: flavor.ramMB,
          diskGB: flavor.diskGB,
          familyId: upsertedFamily.id,
        },
        update: {
          cpuCores: flavor.cpuCores,
          ramMB: flavor.ramMB,
          diskGB: flavor.diskGB,
        },
      });
    }
  }

  console.log('Worker families created successfully!');
};

const createWorkerImages = async () => {
  console.log('Creating worker images...');

  const images = [
    {
      name: 'ubuntu-24.04',
      description: 'Ubuntu 24.04 LTS',
      osType: 'linux',
      osFamily: 'ubuntu',
      osVersion: '24.04',
      imageUrl: 'https://releases.ubuntu.com/jammy/ubuntu-22.04.5-live-server-amd64.iso',
      architecture: 'amd64',
      virtualizationType: 'iso',
    },
  ];

  for (const image of images) {
    await prisma.workerImage.upsert({
      where: { name: image.name },
      create: image,
      update: image,
    });
  }

  console.log('Worker images created successfully!');
}

const main = async () => {
  const calls = [createCompany, createUsers, createWorkerFamilies, createWorkerImages];
  for (const call of calls) {
    await call();
  }
};

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
