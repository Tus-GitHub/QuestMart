import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import nextEnv from "@next/env";
import { withTransaction, closePool } from "../lib/db.mjs";

const migrationDirectory = fileURLToPath(new URL("../db/migrations/", import.meta.url));

// Caller owns the transaction. Taking the lock before creating the ledger makes
// concurrent deployments serialize both the schema setup and migration checks.
export async function applyMigrations(client, directory = migrationDirectory) {
  await client.query("SELECT pg_advisory_xact_lock(190184, 1)");
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const files = (await readdir(directory)).filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
  const applied = [];
  for (const name of files) {
    // Git can change line endings between Windows and a Linux deployment.
    const sql = (await readFile(path.join(directory, name), "utf8")).replace(/\r\n/g, "\n");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const { rows } = await client.query("SELECT checksum FROM schema_migrations WHERE name = $1", [name]);
    if (rows.length) {
      if (rows[0].checksum !== checksum) throw new Error(`Migration ${name} changed after it was applied; add a new migration instead.`);
      continue;
    }
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [name, checksum]);
    applied.push(name);
  }
  return applied;
}

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  try {
    const applied = await withTransaction(client => applyMigrations(client));
    console.log(applied.length ? `Applied migrations: ${applied.join(", ")}` : "Database migrations are up to date.");
  } catch (error) {
    console.error(`Database migration failed (${error.code || "configuration/schema error"}). Check DATABASE_URL and the migration files.`);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
