import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
const suffix = randomUUID().replaceAll("-", "");
const email = `smoke-${suffix}@example.invalid`;
const customerEmail = `customer-${suffix}@example.invalid`;
const password = randomBytes(24).toString("base64url");
const customerPassword = randomBytes(24).toString("base64url");
const phone = `+254700${suffix.slice(0, 7)}`;
let orderNumber;
let adminId;
let customerUserId;

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

  const registration = await fetch(`${baseUrl}/api/customer/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Smoke Test Customer",
      email: customerEmail,
      phone,
      password: customerPassword,
    }),
  });
  await assert(registration.status === 201, "Customer registration failed.");
  const customer = await prisma.user.findUnique({ where: { email: customerEmail }, select: { id: true } });
  await assert(customer, "Registered customer was not created.");
  customerUserId = customer.id;
  const customerLogin = await fetch(`${baseUrl}/api/customer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: customerEmail, password: customerPassword }),
  });
  await assert(customerLogin.ok, "Valid customer credentials were rejected.");
  const customerCookieHeader = customerLogin.headers.get("set-cookie");
  await assert(customerCookieHeader?.includes("puredrie-customer="), "Customer login did not set a session cookie.");
  const customerCookie = customerCookieHeader.split(";")[0];

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
  const orderPage = await allowed.json();
  await assert(Array.isArray(orderPage.orders) && Number.isInteger(orderPage.totalPages), "Orders API did not return a paginated result.");

  const checkout = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: customerCookie },
    body: JSON.stringify({
      fullName: "Pure Drie Smoke Test",
      phone,
      email: customerEmail,
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
  const newOrderNotice = await prisma.notification.findFirst({
    where: { userId: adminId, dedupeKey: `ORDER_CREATED:${order.id}:${adminId}` },
  });
  await assert(newOrderNotice, "New orders did not notify administrators.");

  const missingReason = await fetch(`${baseUrl}/api/admin/orders/${order.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ orderStatus: "CANCELLED" }),
  });
  await assert(missingReason.status === 400, "Cancellation without a reason was not rejected.");

  const cancellation = await fetch(`${baseUrl}/api/admin/orders/${order.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ orderStatus: "CANCELLED", cancellationReason: "Smoke test cleanup" }),
  });
  await assert(cancellation.ok, "Order cancellation with a reason failed.");
  const cancelledOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { statusHistory: true },
  });
  await assert(cancelledOrder?.orderStatus === "CANCELLED", "Cancelled order status was not persisted.");
  await assert(cancelledOrder.statusHistory.some((event) => event.note?.includes("Smoke test cleanup")), "Cancellation reason was not retained in order history.");

  const customerNotice = await prisma.notification.findFirst({
    where: { userId: customerUserId, type: "ORDER_STATUS_CHANGED" },
  });
  await assert(customerNotice?.message.includes("Smoke test cleanup"), "Customers were not notified of order status changes.");

  const search = await fetch(`${baseUrl}/api/admin/orders?search=${encodeURIComponent(orderNumber)}&pageSize=10`, {
    headers: { Cookie: cookie },
  });
  const searchResult = await search.json();
  await assert(search.ok && searchResult.total === 1 && searchResult.orders[0].id === order.id, "Server-side order search failed.");
  const markRead = await fetch(`${baseUrl}/api/notifications/${customerNotice.id}`, {
    method: "PATCH",
    headers: { Cookie: customerCookie },
  });
  await assert(markRead.ok, "Customer could not mark their notification as read.");

  console.log("Smoke test passed: customer registration/login, checkout, order search, cancellation history, notifications, and admin access.");
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
      if (order) {
        await prisma.notification.deleteMany({
          where: {
            OR: [
              { dedupeKey: { startsWith: `ORDER_CREATED:${order.id}:` } },
              { href: `/account#order-${order.id}` },
            ],
          },
        });
        await prisma.order.delete({ where: { id: order.id } });
      }
      await prisma.customer.deleteMany({ where: { phone } });
    }
    if (orderNumber) await prisma.order.deleteMany({ where: { orderNumber } });
    if (customerUserId) await prisma.user.deleteMany({ where: { id: customerUserId } });
    if (adminId) await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });
