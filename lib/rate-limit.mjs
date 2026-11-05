import { createHmac } from "node:crypto";
import { ipAddress } from "@vercel/functions";
import { query } from "./db.mjs";
import { ApiError } from "./http.mjs";

export async function rateLimit(request, scope, limit = 30, userId = "") {
  const identity =
    userId ||
    (process.env.VERCEL ? ipAddress(request) : "localhost") ||
    "unknown";
  const key = createHmac("sha256", process.env.JWT_SECRET)
    .update(`${scope}:${identity}`)
    .digest("hex");
  const {
    rows: [row],
  } = await query(
    `INSERT INTO request_limits(key_hash,window_start,attempts) VALUES($1,now(),1)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts=CASE WHEN request_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE request_limits.attempts+1 END,
      window_start=CASE WHEN request_limits.window_start<now()-interval '15 minutes' THEN now() ELSE request_limits.window_start END
    RETURNING attempts`,
    [key],
  );
  if (row.attempts > limit)
    throw new ApiError(
      429,
      "Too many attempts. Please try again in 15 minutes.",
    );
}
