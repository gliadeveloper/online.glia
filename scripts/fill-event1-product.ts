import dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

import { EVENT1_PRODUCT_ID, EVENT1_PRODUCT_TITLE } from "../src/lib/shop-event1-product";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

/** Prints the event1 product from DB. Copy is not stored in this repo. */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 60_000,
    idleTimeoutMillis: 20_000,
    keepAlive: true,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const product =
      (await prisma.product.findUnique({
        where: { id: EVENT1_PRODUCT_ID },
        select: { id: true, title: true, description: true, supplies: true, listPrice: true },
      })) ??
      (await prisma.product.findFirst({
        where: { title: EVENT1_PRODUCT_TITLE },
        select: { id: true, title: true, description: true, supplies: true, listPrice: true },
      }));

    if (!product) {
      throw new Error(
        `Product not found (${EVENT1_PRODUCT_ID} or title "${EVENT1_PRODUCT_TITLE}")`,
      );
    }

    console.log(JSON.stringify(product, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
