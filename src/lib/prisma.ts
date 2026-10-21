import "server-only";
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { postgresUtcConfig } from "./postgres-utc";

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required (PostgreSQL).",
    );
  }
  return connectionString;
}

function createPool() {
  const pool = new Pool(postgresUtcConfig({
    connectionString: getConnectionString(),
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  }));

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
  // A per-query reconnect can escape an interactive transaction. Transactions
  // must fail atomically; callers may retry the complete operation after abort.
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
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
