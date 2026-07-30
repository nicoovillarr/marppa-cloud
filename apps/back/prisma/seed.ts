import { PASSWORD_HASHER_SYMBOL, PasswordHasher } from "@/user/domain/services/password-hasher.service";
import { UserModule } from "@/user/user.module";
import { NestFactory } from "@nestjs/core";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import * as dotenv from 'dotenv';
import { ConnectionOptions } from "tls";

const env = process.env.NODE_ENV ?? 'development';

dotenv.config({
  path: [
    `.env.${env}.local`,
    '.env.local',
    `.env.${env}`,
    '.env',
  ],
});

const dbCA = process.env.DB_CA;
let ssl: ConnectionOptions | undefined;

if (dbCA) {
  ssl = {
    ca: dbCA,
    rejectUnauthorized: true,
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
      description:
        'General purpose.',
      architecture: 'amd64',
      flavors: [
        { name: 'nano', cpuCores: 0.5, ramMB: 1024 },
        { name: 'small', cpuCores: 1, ramMB: 2048 },
        { name: 'medium', cpuCores: 2, ramMB: 4096 },
        { name: 'large', cpuCores: 4, ramMB: 8192 },
      ],
    },

    {
      name: 'spark',
      description:
        'CPU optimized: twice the cores per GB of RAM.',
      architecture: 'amd64',
      flavors: [
        { name: 'small', cpuCores: 2, ramMB: 2048 },
        { name: 'medium', cpuCores: 4, ramMB: 4096 },
        { name: 'large', cpuCores: 8, ramMB: 8192 },
      ],
    },

    {
      name: 'vault',
      description:
        'Memory optimized: four times the RAM per core.',
      architecture: 'amd64',
      flavors: [
        { name: 'small', cpuCores: 1, ramMB: 4096 },
        { name: 'medium', cpuCores: 2, ramMB: 8192 },
        { name: 'large', cpuCores: 4, ramMB: 16384 },
      ],
    },
  ];

  for (const family of families) {
    const upsertedFamily = await prisma.workerFamily.upsert({
      where: { name: family.name },
      create: {
        name: family.name,
        description: family.description,
        architecture: family.architecture,
      },
      update: {
        description: family.description,
        architecture: family.architecture,
        deprecatedAt: null,
      },
    });

    for (const flavor of family.flavors) {
      await upsertSeededFlavor(upsertedFamily.id, flavor);
    }
  }

  await deprecateFamiliesNotIn(families.map((family) => family.name));

  console.log('Worker families created successfully!');
};

type SeededFlavor = {
  name: string;
  cpuCores: number;
  ramMB: number;
};

const upsertSeededFlavor = async (familyId: number, flavor: SeededFlavor) => {
  const active = await prisma.workerFlavor.findFirst({
    where: { familyId, name: flavor.name, deprecatedAt: null },
  });

  if (!active) {
    await prisma.workerFlavor.create({
      data: { ...flavor, familyId },
    });
    return;
  }

  const matchesSeed =
    active.cpuCores === flavor.cpuCores &&
    active.ramMB === flavor.ramMB;

  if (matchesSeed) {
    return;
  }

  const { _max } = await prisma.workerFlavor.aggregate({
    where: { familyId, name: flavor.name },
    _max: { version: true },
  });

  await prisma.$transaction([
    prisma.workerFlavor.create({
      data: { ...flavor, familyId, version: (_max.version ?? 0) + 1 },
    }),
    prisma.workerFlavor.update({
      where: { id: active.id },
      data: { deprecatedAt: new Date() },
    }),
  ]);
};

const deprecateFamiliesNotIn = async (names: string[]) => {
  const deprecatedAt = new Date();

  const dropped = await prisma.workerFamily.findMany({
    where: { name: { notIn: names }, ownerId: null, deprecatedAt: null },
    select: { id: true, name: true },
  });

  if (dropped.length === 0) {
    return;
  }

  const ids = dropped.map((family) => family.id);

  await prisma.$transaction([
    prisma.workerFamily.updateMany({
      where: { id: { in: ids } },
      data: { deprecatedAt },
    }),
    prisma.workerFlavor.updateMany({
      where: { familyId: { in: ids }, deprecatedAt: null },
      data: { deprecatedAt },
    }),
  ]);

  console.log(
    `Deprecated families no longer seeded: ${dropped.map((f) => f.name).join(', ')}`,
  );
};

const createWorkerImages = async () => {
  console.log('Creating worker images...');

  const images = [
    // Cloud image (qcow2), NOT the live-server installer ISO: workers are booted
    // with `virt-install --import` + a NoCloud seed, so the base disk must be a
    // pre-installed, cloud-init-enabled image.
    {
      name: 'ubuntu-24.04',
      description: 'Ubuntu 24.04 LTS (cloud image)',
      osType: 'linux',
      osFamily: 'ubuntu',
      osVersion: '24.04',
      imageUrl:
        'https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img',
      architecture: 'amd64',
      virtualizationType: 'qcow2',
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

const createAtomSizes = async () => {
  console.log('Creating atom sizes...');

  const sizes = [
    { name: 'nano', cpuCores: 0.25, ramMB: 256 },
    { name: 'small', cpuCores: 0.5, ramMB: 512 },
    { name: 'medium', cpuCores: 1, ramMB: 1024 },
    { name: 'large', cpuCores: 2, ramMB: 4096 },
  ];

  for (const size of sizes) {
    await upsertSeededAtomSize(size);
  }

  console.log('Atom sizes created successfully!');
};

type SeededAtomSize = {
  name: string;
  cpuCores: number;
  ramMB: number;
};

const upsertSeededAtomSize = async (size: SeededAtomSize) => {
  const active = await prisma.atomSize.findFirst({
    where: { name: size.name, deprecatedAt: null },
  });

  if (!active) {
    await prisma.atomSize.create({ data: size });
    return;
  }

  if (active.cpuCores === size.cpuCores && active.ramMB === size.ramMB) {
    return;
  }

  const { _max } = await prisma.atomSize.aggregate({
    where: { name: size.name },
    _max: { version: true },
  });

  await prisma.$transaction([
    prisma.atomSize.create({
      data: { ...size, version: (_max.version ?? 0) + 1 },
    }),
    prisma.atomSize.update({
      where: { id: active.id },
      data: { deprecatedAt: new Date() },
    }),
  ]);
};

const activeAtomSizeId = async (name: string): Promise<number> => {
  const size = await prisma.atomSize.findFirst({
    where: { name, deprecatedAt: null },
  });

  if (!size) {
    throw new Error(`Atom size "${name}" is missing; seed the sizes first.`);
  }

  return size.id;
};

const createAtomImages = async () => {
  console.log('Creating atom images...');

  // This table *is* the approval: an Atom can only reference a row that exists
  // here, so a container image (and the privileges it may ask the host for)
  // enters the platform through a reviewed change, never through the API.
  const images = [
    {
      name: 'redis-7',
      description: 'Redis 7 (Alpine)',
      registry: 'docker.io',
      repository: 'library/redis',
      tag: '7-alpine',
      architecture: 'amd64',
      defaultSize: 'small',
      capabilities: [],
      sysctls: undefined,
    },

    {
      name: 'postgresql-17',
      description: 'PostgreSQL 17 (Alpine). Requires POSTGRES_PASSWORD.',
      registry: 'docker.io',
      repository: 'library/postgres',
      tag: '17-alpine',
      architecture: 'amd64',
      defaultSize: 'large',
      capabilities: [],
      sysctls: undefined,
      requiredEnvVars: ['POSTGRES_PASSWORD'],
    },

    {
      name: 'ubuntu-24.04',
      description: 'Ubuntu 24.04 LTS (docker image)',
      registry: 'docker.io',
      repository: 'ubuntu',
      tag: '24.04',
      architecture: 'amd64',
      defaultSize: 'small',
      capabilities: [],
      sysctls: undefined,
      command: ['sleep', 'infinity'],
    },

    {
      // NET_ADMIN is tenant-safe: it only reconfigures the container's own
      // network namespace, and without NET_RAW (dropped by the runtime baseline)
      // it cannot capture packets or forge ARP on the zone bridge. The image also
      // documents SYS_MODULE to insmod wireguard, which is refused outright —
      // load it on the host instead:
      //   sudo modprobe wireguard
      //   echo wireguard | sudo tee /etc/modules-load.d/wireguard.conf
      name: 'wg-easy-14',
      description:
        'wg-easy 14 (WireGuard + web UI). Publish one UDP fiber for the VPN and reach the rest of the zone through it. Requires WG_HOST and PASSWORD_HASH.',
      registry: 'ghcr.io',
      repository: 'wg-easy/wg-easy',
      tag: '14',
      architecture: 'amd64',
      defaultSize: 'nano',
      capabilities: ['NET_ADMIN'],
      sysctls: {
        'net.ipv4.ip_forward': '1',
        'net.ipv4.conf.all.src_valid_mark': '1',
      },
      requiredEnvVars: ['WG_HOST', 'PASSWORD_HASH'],
    },
  ];

  for (const { defaultSize, ...image } of images) {
    const data = {
      ...image,
      defaultSizeId: await activeAtomSizeId(defaultSize),
    };

    await prisma.atomImage.upsert({
      where: { name: image.name },
      create: data,
      update: data,
    });
  }

  await pruneUnapprovedAtomImages(images.map((image) => image.name));

  console.log('Atom images created successfully!');
};

/**
 * The list above is the approval, so a row that is no longer in it is no longer
 * approved and must stop being selectable. Images still referenced by an atom
 * are reported instead of deleted — the foreign key would reject it anyway, and
 * silently tearing down a running service is worse than saying so.
 */
const pruneUnapprovedAtomImages = async (approved: string[]) => {
  const stale = await prisma.atomImage.findMany({
    where: { name: { notIn: approved } },
    include: { _count: { select: { atoms: true } } },
  });

  for (const image of stale) {
    if (image._count.atoms > 0) {
      console.warn(
        `Image "${image.name}" is no longer approved but ${image._count.atoms} atom(s) still use it. ` +
        'Delete those atoms first, then re-run the seed.',
      );
      continue;
    }

    await prisma.atomImage.delete({ where: { id: image.id } });
    console.log(`Removed unapproved atom image "${image.name}"`);
  }
};

const main = async () => {
  const calls = [
    createCompany,
    createUsers,
    createWorkerFamilies,
    createWorkerImages,
    createAtomSizes,
    createAtomImages,
  ];
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
