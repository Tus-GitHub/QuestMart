import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { ApiError } from "./http.mjs";
export const tokenHash = (raw) =>
  createHash("sha256").update(raw).digest("hex");
export function recoveryEmail(value) {
  if (
    typeof value !== "string" ||
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
    /[,;<>()[\]"\\]/.test(value)
  )
    throw new ApiError(400, "Enter a valid email address.");
  return value.trim().toLowerCase();
}
export function resetPasswordInput(value, confirmation) {
  if (
    typeof value !== "string" ||
    value.length < 6 ||
    Buffer.byteLength(value, "utf8") > 72
  )
    throw new ApiError(400, "Use 6–72 characters (maximum 72 UTF-8 bytes).");
  if (value !== confirmation)
    throw new ApiError(400, "Passwords do not match.");
  return value;
}
export function createAccountEmail(db, send) {
  async function issue(purpose, email) {
    const delivery = await db.withTransaction(async (client) => {
      const {
        rows: [user],
      } = await client.query(
        "SELECT id,username,email,email_verified_at,email_verification_required,account_status,session_version FROM users WHERE email=$1 FOR UPDATE",
        [email],
      );
      if (
        !user ||
        user.account_status !== "active" ||
        (purpose === "verify" && user.email_verified_at)
      )
        return null;
      const recent = await client.query(
        "SELECT 1 FROM account_email_tokens WHERE user_id=$1 AND purpose=$2 AND created_at > now()-interval '60 seconds' LIMIT 1",
        [user.id, purpose],
      );
      if (recent.rowCount) return null;
      await client.query(
        "UPDATE account_email_tokens SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL",
        [user.id, purpose],
      );
      const raw = randomBytes(32).toString("hex");
      await client.query(
        "INSERT INTO account_email_tokens(token_hash,user_id,purpose,session_version,expires_at) VALUES($1,$2,$3,$4,now()+$5::interval)",
        [
          tokenHash(raw),
          user.id,
          purpose,
          user.session_version,
          purpose === "verify" ? "24 hours" : "30 minutes",
        ],
      );
      return { user, raw };
    });
    if (delivery) {
      try {
        await send(purpose, delivery.user, delivery.raw);
      } catch {
        console.error("Account email delivery failed; resend is available.");
        return false;
      }
    }
    return true;
  }
  async function redeem(purpose, raw, password) {
    if (!["verify", "reset"].includes(purpose))
      throw new ApiError(400, "Invalid account action.");
    if (purpose === "reset") password = resetPasswordInput(password, password);
    if (typeof raw !== "string" || !/^[a-f0-9]{64}$/.test(raw))
      throw new ApiError(
        400,
        "This link is invalid or expired. Request a new one.",
      );
    const hash = password ? await bcrypt.hash(password, 12) : null;
    const user = await db.withTransaction(async (client) => {
      // Serialize on the account before locking tokens, matching issue() lock order.
      const {
        rows: [owner],
      } = await client.query(
        "SELECT user_id FROM account_email_tokens WHERE token_hash=$1 AND purpose=$2",
        [tokenHash(raw), purpose],
      );
      if (!owner)
        throw new ApiError(
          400,
          "This link is invalid or expired. Request a new one.",
        );
      const {
        rows: [current],
      } = await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [
        owner.user_id,
      ]);
      const {
        rows: [token],
      } = await client.query(
        "SELECT * FROM account_email_tokens WHERE token_hash=$1 AND purpose=$2 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE",
        [tokenHash(raw), purpose],
      );
      if (
        !token ||
        !current ||
        current.account_status !== "active" ||
        (purpose === "reset" &&
          token.session_version !== current.session_version)
      )
        throw new ApiError(
          400,
          "This link is invalid or expired. Request a new one.",
        );
      await client.query(
        "UPDATE account_email_tokens SET consumed_at=now() WHERE token_hash=$1",
        [tokenHash(raw)],
      );
      if (purpose === "verify") {
        const first = !current.email_verified_at;
        await client.query(
          "UPDATE users SET email_verified_at=COALESCE(email_verified_at,now()),email_verification_required=false WHERE id=$1",
          [current.id],
        );
        return { ...current, first };
      }
      await client.query(
        "UPDATE users SET password_hash=$2,session_version=session_version+1,password_change_required=false WHERE id=$1",
        [current.id, hash],
      );
      await client.query(
        "UPDATE account_email_tokens SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL",
        [current.id, "reset"],
      );
      return current;
    });
    if (purpose === "verify" && user.first) {
      try {
        await send("welcome", user);
      } catch {
        console.error(
          "Welcome email delivery failed. Account verification succeeded.",
        );
      }
    }
    return user;
  }
  return { issue, redeem };
}
