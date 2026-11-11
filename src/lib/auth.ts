import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "qsport_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is required in production");
    }
    return "dev-fallback-secret-change-me";
  }
  return secret;
}

function sign(value: string): string {
  const sig = createHmac("sha256", getSecret()).update(value).digest("hex");
  return `${value}.${sig}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  return expected === signed ? value : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = unsign(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      street: true,
      city: true,
      zip: true,
      newsletter: true,
      createdAt: true,
      role: true,
    },
  });

  return user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/prihlaseni?redirect=/admin");
  }
  if (user.role !== "admin") {
    redirect("/prihlaseni?error=noadmin&redirect=/admin");
  }
  return user;
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}
