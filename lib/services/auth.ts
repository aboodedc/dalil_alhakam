/**
 * Service layer — class diagram: User.
 *
 * `register()` and `login()` keep the password/token mechanics out of the
 * route handlers; the route still owns HTTP status codes and the cookie.
 */
import { prisma } from "@/lib/db";
import { comparePassword, hashPassword } from "@/lib/auth/password";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "MANAGER" | "ADMIN";
  totpEnabled: boolean;
};

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  totpEnabled: true,
} as const;

export type RegisterResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "email already registered" };

/** User.register(): void — create a USER account (email is unique). */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "email already registered" };

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: "USER",
    },
    select: publicUserSelect,
  });
  return { ok: true, user };
}

/** User.login(): void — verify credentials; null = wrong email or password. */
export async function login(input: {
  email: string;
  password: string;
}): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  });
  const matches = user ? await comparePassword(input.password, user.passwordHash) : false;
  if (!user || !matches) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    totpEnabled: user.totpEnabled,
  };
}
