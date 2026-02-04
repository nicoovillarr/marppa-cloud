import { PASSWORD_HASHER_SYMBOL, PasswordHasher } from "@/user/domain/services/password-hasher.service";
import { UserModule } from "@/user/user.module";
import { NestFactory } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const createCompany = async () => {
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
  })
}

const createUsers = async () => {
  const app = await NestFactory.createApplicationContext(UserModule);

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

  console.log("Users created successfully");

  await app.close();
};

const main = async () => {
  const calls = [createCompany, createUsers];
  for (const call of calls) {
    await call();
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
