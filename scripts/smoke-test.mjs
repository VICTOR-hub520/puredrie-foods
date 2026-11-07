import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const suffix = randomUUID().replaceAll("-", "");
const email = `smoke-${suffix}@example.invalid`;
const password = randomBytes(24).toString("base64url");
const phone = `+254700${suffix.slice(0, 7)}`;
let orderNumber;
let adminId;

async function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const productsResponse = await fetch(`${baseUrl}/api/products`);
  await assert(productsResponse.ok, "Product API did not return success.");
  const products = await productsResponse.json();
  const variant = products.find((product) => product.variants.length)?.variants[0];
  await assert(variant, "No seeded product package is available.");

  const denied = await fetch(`${baseUrl}/api/admin/orders`);
  await assert(denied.status === 401, "Admin orders endpoint was not protected.");

  const invalidOrder = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [] }),
  });
  await assert(invalidOrder.status === 400, "Invalid checkout input was not rejected.");

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Smoke-test administrator role." },
  });
  const admin = await prisma.user.create({
    data: {
      name: "Temporary Smoke Test Admin",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      userRoles: { create: { roleId: adminRole.id } },
    },
  });
  adminId = admin.id;
  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await assert(login.ok, "Valid administrator credentials were rejected.");
  const setCookie = login.headers.get("set-cookie");
  await assert(setCookie?.includes("puredrie-admin="), "Login did not set a session cookie.");
  const cookie = setCookie.split(";")[0];
  const allowed = await fetch(`${baseUrl}/api/admin/orders`, { headers: { Cookie: cookie } });
  await assert(allowed.ok, "Authenticated administrator could not access orders.");

  const checkout = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Pure Drie Smoke Test",
      phone,
      email: "",
      deliveryAddress: "1 Test Lane, Nairobi",
      deliveryTown: "Nairobi",
      paymentMethod: "MPESA",
      items: [{ variantId: variant.id, quantity: 2, price: 1 }],
    }),
  });
  const result = await checkout.json();
  await assert(checkout.status === 201, result.error ?? "Checkout did not create an order.");
  orderNumber = result.orderNumber;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: true, statusHistory: true },
  });
  await assert(order, "Created order was not found in the database.");
  await assert(order.subtotal.toNumber() === variant.price * 2, "Checkout trusted a client-supplied price.");
  await assert(order.items.length === 1 && order.items[0].quantity.toNumber() === 2, "Order lines were not saved.");
  await assert(order.paymentStatus === "PENDING" && order.payments.length === 0, "A pending order should not be misreported as a received payment.");
  await assert(order.deliveryFee.toNumber() === 0, "Delivery was not free.");
  await assert(order.statusHistory.some((event) => event.toStatus === "NEW"), "Order history was not recorded.");

  console.log("Smoke test passed: catalogue, validation, checkout, database transaction, and admin session access.");
}

main()
  .catch((error) => {
    console.error("Smoke test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (orderNumber) {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      });
      if (order) await prisma.order.delete({ where: { id: order.id } });
      await prisma.customer.deleteMany({ where: { phone } });
    }
    if (orderNumber) await prisma.order.deleteMany({ where: { orderNumber } });
    if (adminId) await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });
