/**
 * Create demo ADMIN / MANAGER accounts for the role-gated flows
 * (Modify Sources, Manage Accounts, source-request review).
 *
 * Run: npm run db:demo-users
 * Override credentials with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD /
 * SEED_MANAGER_EMAIL / SEED_MANAGER_PASSWORD.
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const accounts = [
    {
      email: (process.env.SEED_ADMIN_EMAIL ?? "admin@dalil.local").toLowerCase(),
      password: process.env.SEED_ADMIN_PASSWORD ?? "Admin123!",
      name: "Admin",
      role: "ADMIN" as const,
    },
    {
      email: (process.env.SEED_MANAGER_EMAIL ?? "manager@dalil.local").toLowerCase(),
      password: process.env.SEED_MANAGER_PASSWORD ?? "Manager123!",
      name: "Manager",
      role: "MANAGER" as const,
    },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash: await hashPassword(account.password),
      },
      update: {
        name: account.name,
        role: account.role,
        passwordHash: await hashPassword(account.password),
      },
    });
    console.log(`✔ ${account.role}: ${account.email}`);
  }
}

main()
  .catch((error) => {
    console.error("Demo users seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
