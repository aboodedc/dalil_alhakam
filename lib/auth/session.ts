/**
 * Session helpers shared by API routes (Login / Register / role checks).
 *
 * Reads the bearer token (explicit `200 OK + token` flow) or the HttpOnly
 * `dalil_token` cookie (set by /api/login and /api/register).
 */
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_TTL_SECONDS, verifyToken } from "./token";

export const SESSION_COOKIE = "dalil_token";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "MANAGER" | "ADMIN";
  totpEnabled: boolean;
};

export type SessionResult = {
  /** none = no credentials were sent; invalid = bad/expired token; valid = authenticated */
  status: "none" | "invalid" | "valid";
  user: SessionUser | null;
};

function bearerOf(request?: NextRequest): string | null {
  const header = request?.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const value = header.slice(7).trim();
    return value || null;
  }
  return null;
}

export async function readSession(request?: NextRequest): Promise<SessionResult> {
  let token = bearerOf(request);
  if (!token) {
    const store = await cookies();
    token = store.get(SESSION_COOKIE)?.value ?? null;
  }
  if (!token) return { status: "none", user: null };

  const payload = verifyToken(token);
  if (!payload) return { status: "invalid", user: null };

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, totpEnabled: true },
  });
  if (!user) return { status: "invalid", user: null };
  return { status: "valid", user };
}

export async function getSessionUser(request?: NextRequest): Promise<SessionUser | null> {
  const session = await readSession(request);
  return session.user;
}

/**
 * `isTokenEnough()` from the Ask sequence. A malformed/expired token is an
 * error; no token at all keeps the anonymous demo working.
 */
export async function isTokenEnough(request?: NextRequest): Promise<boolean> {
  const session = await readSession(request);
  return session.status !== "invalid";
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function isManagerOrAdmin(user: SessionUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "MANAGER";
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "ADMIN";
}
