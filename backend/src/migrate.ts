import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";

loadLocalEnv(resolve(process.cwd(), ".env"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for migrations.");
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  const schemaPath = resolve(process.cwd(), "schema", "user-system.sql");
  const sql = readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  await pool.query(`
    create table if not exists user_store_documents (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
  console.log("[Migration] user system schema is ready.");
} finally {
  await pool.end();
}

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
