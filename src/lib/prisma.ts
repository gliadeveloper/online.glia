import "server-only";
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required (PostgreSQL — use Prisma Postgres on Vercel or local Postgres).",
    );
  }
  return connectionString;
}

function isTransientDbError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    return code === "P1017" || code === "P1001";
  }
  return false;
}

function createPool() {
  const pool = new Pool({
    connectionString: getConnectionString(),
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

  pool.on("error", (error) => {
    console.error("[prisma] pg pool idle client error:", error.message);
  });

  return pool;
}

type PrismaGlobal = {
  prisma: ReturnType<typeof buildPrismaClient> | undefined;
  pgPool: Pool | undefined;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function getPool() {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = createPool();
  }
  return globalForPrisma.pgPool;
}

async function disposePrisma() {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  if (globalForPrisma.pgPool) {
    await globalForPrisma.pgPool.end().catch(() => undefined);
    globalForPrisma.pgPool = undefined;
  }
}

function buildPrismaClient() {
  const adapter = new PrismaPg(getPool());
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    name: "connection-retry",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          try {
            return await query(args);
          } catch (error) {
            if (!isTransientDbError(error)) {
              throw error;
            }

            await disposePrisma();
            const fresh = getPrisma();
            const delegateKey = `${model.charAt(0).toLowerCase()}${model.slice(1)}`;
            const delegate = (
              fresh as unknown as Record<string, Record<string, (input: unknown) => Promise<unknown>>>
            )[delegateKey];
            const retry = delegate?.[operation];

            if (!retry) {
              throw error;
            }

            return retry(args);
          }
        },
      },
    },
  });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = buildPrismaClient();
  }

  return globalForPrisma.prisma as unknown as PrismaClient;
}

export const prisma = getPrisma();

export async function reconnectPrisma() {
  await disposePrisma();
  return getPrisma();
}
