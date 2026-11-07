import "server-only";
import { cookies } from "next/headers";
import { errors as joseErrors, SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const adminCookieName = "puredrie-admin";
const customerCookieName = "puredrie-customer";
const lifetimeSeconds = 60 * 60 * 8;

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(userId: string): Promise<void> {
  const token = await new SignJWT({ role: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${lifetimeSeconds}s`)
    .sign(sessionKey());

  const store = await cookies();
  store.set(adminCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: lifetimeSeconds,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(adminCookieName);
}

async function getSessionUser(cookieName: string, roleName: string) {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    if (payload.role !== roleName || typeof payload.sub !== "string") return null;
    userId = payload.sub;
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) return null;
    throw error;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      userRoles: { some: { role: { name: roleName } } },
    },
    select: { id: true, name: true, email: true },
  });
}

export async function getAdminUser() {
  return getSessionUser(adminCookieName, "ADMIN");
}

export async function createCustomerSession(userId: string): Promise<void> {
  const token = await new SignJWT({ role: "CUSTOMER" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${lifetimeSeconds}s`)
    .sign(sessionKey());

  const store = await cookies();
  store.set(customerCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: lifetimeSeconds,
  });
}

export async function clearCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(customerCookieName);
}

export async function getCustomerUser() {
  return getSessionUser(customerCookieName, "CUSTOMER");
}
