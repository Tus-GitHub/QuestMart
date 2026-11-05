import pg from "pg";

const poolKey = Symbol.for("questmart.postgres.pool");

function getPool() {
  if (globalThis[poolKey]) return globalThis[poolKey];
  const connectionString = process.env.DATABASE_URL;
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Set DATABASE_URL to a valid PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
    throw new Error("Set DATABASE_URL to a valid PostgreSQL connection URL with a database name.");
  }
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
    query_timeout: 15000,
    application_name: "questmart",
  });
  // Do not log URLs or driver errors, which can contain connection details.
  pool.on("error", () => console.error("An idle PostgreSQL connection failed."));
  globalThis[poolKey] = pool;
  return pool;
}

export function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(fn) {
  const client = await getPool().connect();
  let discardConnection = false;
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discardConnection = true;
    }
    throw error;
  } finally {
    client.release(discardConnection);
  }
}

export async function closePool() {
  const pool = globalThis[poolKey];
  delete globalThis[poolKey];
  if (pool) await pool.end();
}
