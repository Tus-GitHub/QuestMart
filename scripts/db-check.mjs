import nextEnv from "@next/env";
import { query, closePool } from "../lib/db.mjs";

nextEnv.loadEnvConfig(process.cwd());
try {
  const { rows } = await query(`SELECT current_setting('server_version_num')::integer AS version,
    to_regclass('users') IS NOT NULL AS users,
    to_regclass('listings') IS NOT NULL AS listings,
    to_regclass('orders') IS NOT NULL AS orders,
    to_regclass('game_prices') IS NOT NULL AS game_prices,
    to_regclass('schema_migrations') IS NOT NULL AS migrations`);
  const status = rows[0];
  if (status.version < 140000) throw new Error("Unsupported PostgreSQL version");
  const schemaReady = [status.users, status.listings, status.orders, status.game_prices, status.migrations].every(Boolean);
  console.log(`PostgreSQL connection OK. Schema ${schemaReady ? "ready" : "not ready; run npm run db:migrate"}.`);
  if (!schemaReady) process.exitCode = 1;
} catch (error) {
  console.error(`PostgreSQL check failed (${error.code || "configuration/version error"}). Check DATABASE_URL and server availability.`);
  process.exitCode = 1;
} finally {
  await closePool();
}
