import prisma from "@/libs/prisma";
import Security from "@/libs/security";

const createUsers = async () => {
  const user = await prisma.user.create({
    data: {
      id: "u-000001",
      name: "ROOT",
      email: "nvillar@marppa.com",
      password: await Security.hashPassword("1234"),
      company: {
        create: {
          id: "c-000001",
          name: "Marppa Cloud Solution",
          alias: "MCS",
          description: "MCS Root Company",
        },
      },
    },
  });
  console.log("Users created successfully");
};

const main = async () => {
  const calls = [createUsers()];
  await Promise.all(calls);
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
