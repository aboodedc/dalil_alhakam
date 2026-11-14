import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

await client.connect();
const { rows } = await client.query(
  `SELECT id, email, name, role,
          ("passwordHash" IS NOT NULL) AS has_password,
          "createdAt"
     FROM public."User"
    ORDER BY "createdAt" ASC`,
);
console.log(JSON.stringify(rows, null, 2));
console.log(`total users: ${rows.length}`);
await client.end();
