// Operator-only bootstrap. Never called by signup or an HTTP route.
import nextEnv from "@next/env";
import { withTransaction, closePool } from "../lib/db.mjs";
nextEnv.loadEnvConfig(process.cwd());
const username = process.argv[2]?.toLowerCase();
const expectedEmail = process.argv[3]?.toLowerCase();
if (!/^[a-z0-9_-]{3,30}$/.test(username || "") || !expectedEmail?.includes("@"))
  throw new Error(
    "Usage: node scripts/grant-admin.mjs <username> <expected-email>",
  );
try {
  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(702491,1)");
    const user = (
      await client.query(
        "SELECT id,role,account_status FROM users WHERE username=$1 AND email=$2 FOR UPDATE",
        [username, expectedEmail],
      )
    ).rows[0];
    if (!user || user.account_status !== "active")
      throw new Error(
        "The expected active account was not found. No account was changed.",
      );
    if (user.role === "admin") {
      console.log("Account already has administrator access.");
      return;
    }
    await client.query(
      "UPDATE users SET role='admin',password_change_required=true,session_version=session_version+1 WHERE id=$1",
      [user.id],
    );
    await client.query(
      `INSERT INTO admin_audit(actor_id,action,entity_type,entity_id,reason,before_state,after_state) VALUES($1,'user.bootstrap_admin','user',$1,'Owner-authorized administrator setup; password change required.',$2,$3)`,
      [
        user.id,
        JSON.stringify({ role: user.role }),
        JSON.stringify({ role: "admin" }),
      ],
    );
    console.log(
      `Administrator access granted to ${username}; password change required on first use.`,
    );
  });
} finally {
  await closePool();
}
