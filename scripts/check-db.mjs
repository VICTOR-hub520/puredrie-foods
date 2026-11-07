import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [products, orders, customers, users] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.user.count(),
  ]);
  console.log(
    `PostgreSQL connection OK: ${products} products, ${orders} orders, ${customers} customers, ${users} users.`,
  );
}

main()
  .catch((error) => {
    console.error("Database check failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
