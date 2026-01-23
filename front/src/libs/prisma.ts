import { PrismaClient } from "@prisma/client";
import generateUUID from "./uuid-gen";
import { capitalize } from "./capitalize";

function processIds(model: string, data: any): void {
  const prefix = {
    Company: "c-",
    User: "u-",
    Worker: "w-",
    Bit: "b-",
    Zone: "z-",
    Node: "n-",
    Fiber: "f-",
  };

  if (
    prefix[model] &&
    data &&
    typeof data === "object" &&
    (!("id" in data) || data.id == null)
  ) {
    data.id = data.id || generateUUID(prefix[model], 6);
  }

  if (data && typeof data === "object") {
    Object.keys(data).forEach((key) => {
      if (data[key] && typeof data[key] === "object" && "create" in data[key]) {
        processIds(capitalize(key), data[key]["create"]);
      }
    });
  }
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient();
  }
  prisma = globalWithPrisma.prisma;
}

export default prisma.$extends({
  name: "customIdMiddleware",
  query: {
    $allModels: {
      create: async (args) => {
        const { args: a, model, operation, query } = args;

        if (operation === "create") {
          processIds(model, a.data);
        }

        return query(a);
      },
    },
  },
});
