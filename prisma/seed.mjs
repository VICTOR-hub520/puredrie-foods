import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const products = [
  {
    name: "Dried Mangoes",
    slug: "dried-mangoes",
    description: "Sun-dried mango, packed to order for a naturally sweet, chewy snack.",
    image: "/images/mango.svg",
    category: "Dried Fruit",
    variants: [
      { label: "100g", grams: "100", price: "175.00" },
      { label: "200g", grams: "200", price: "340.00" },
    ],
  },
  {
    name: "Dried Pineapples",
    slug: "dried-pineapples",
    description: "Bright, tangy dried pineapple prepared and packed with care.",
    image: "/images/pineapple.svg",
    category: "Dried Fruit",
    variants: [
      { label: "100g", grams: "100", price: "175.00" },
      { label: "200g", grams: "200", price: "340.00" },
    ],
  },
  {
    name: "Assorted Dried Fruits",
    slug: "assorted-dried-fruits",
    description: "A colourful combination of dried fruit, packaged fresh to order.",
    image: "/images/mixed-fruit.svg",
    category: "Dried Fruit",
    variants: [
      { label: "100g", grams: "100", price: "175.00" },
      { label: "200g", grams: "200", price: "340.00" },
    ],
  },
  {
    name: "Moringa Powder",
    slug: "moringa-powder",
    description: "Finely milled moringa powder in a convenient 100g package.",
    image: "/images/moringa-powder.svg",
    category: "Moringa",
    variants: [{ label: "100g", grams: "100", price: "250.00" }],
  },
  {
    name: "Moringa Teabags",
    slug: "moringa-teabags",
    description: "Moringa tea bags in a convenient 50g package.",
    image: "/images/moringa-teabags.svg",
    category: "Moringa",
    variants: [{ label: "50g", grams: "50", price: "150.00" }],
  },
];

const permissions = [
  "dashboard.read",
  "orders.manage",
  "customers.manage",
  "products.manage",
  "inventory.manage",
  "packaging.manage",
  "suppliers.manage",
  "payments.manage",
  "invoices.manage",
  "deliveries.manage",
  "returns.manage",
  "reports.read",
  "staff.manage",
  "settings.manage",
];

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Full business administration access." },
  });
  for (const key of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key.replace(".", " ") },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  for (const product of products) {
    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        image: product.image,
        category: product.category,
        isActive: true,
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        image: product.image,
        category: product.category,
      },
    });

    for (const option of product.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { productId_label: { productId: savedProduct.id, label: option.label } },
        update: { weightGrams: option.grams, isCustom: false, isActive: true },
        create: {
          productId: savedProduct.id,
          label: option.label,
          weightGrams: option.grams,
        },
      });
      const activePrice = await prisma.productPrice.findFirst({
        where: { variantId: variant.id, validUntil: null },
        orderBy: { validFrom: "desc" },
      });
      if (!activePrice) {
        await prisma.productPrice.create({
          data: {
            productId: savedProduct.id,
            variantId: variant.id,
            amount: option.price,
          },
        });
      }
    }
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email || password) {
    if (!email || !password || password.length < 12) {
      throw new Error(
        "Set both ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters to create an administrator.",
      );
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, isActive: true },
      create: { name: "Puredrie Foods Administrator", email, passwordHash },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    });
  }

  console.log("Puredrie Foods products, package prices, roles, and permissions are ready.");
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
