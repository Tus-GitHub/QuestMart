import bcrypt from "bcryptjs";
import { ApiError } from "./http.mjs";
import { validateId } from "./marketplace.mjs";

export const ADMIN_SECTIONS = [
  "overview",
  "users",
  "listings",
  "orders",
  "activity",
  "security",
];
export function adminFilters(params) {
  return {
    search: (params.get("q") || "").trim().slice(0, 120),
    filter: params.get("filter") || "all",
    page: Math.min(
      10000,
      Math.max(1, Number.parseInt(params.get("page"), 10) || 1),
    ),
  };
}
function reasonInput(value) {
  if (
    typeof value !== "string" ||
    value.trim().length < 3 ||
    value.trim().length > 500
  )
    throw new ApiError(400, "Add a reason between 3 and 500 characters.");
  return value.trim();
}
export function validateNewPassword(value) {
  if (
    typeof value !== "string" ||
    value.length < 6 ||
    Buffer.byteLength(value, "utf8") > 72
  )
    throw new ApiError(
      400,
      "Use at least 6 characters and no more than 72 UTF-8 bytes for your new password.",
    );
  return value;
}
function stateOf(item, keys) {
  return Object.fromEntries(keys.map((key) => [key, item[key]]));
}

export function createAdminService(db) {
  async function audit(client, actor, action, type, id, reason, before, after) {
    await client.query(
      `INSERT INTO admin_audit(actor_id,action,entity_type,entity_id,reason,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        actor._id,
        action,
        type,
        id,
        reason,
        JSON.stringify(before),
        JSON.stringify(after),
      ],
    );
  }
  // Serialize administrative changes, then recheck current database authority.
  // A suspended/demoted admin cannot finish an action using an old browser session.
  async function transaction(actor, callback, allowPasswordChange = false) {
    return db.withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(702491,1)");
      const current = (
        await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [
          validateId(actor._id),
        ])
      ).rows[0];
      if (
        !current ||
        current.role !== "admin" ||
        current.account_status !== "active" ||
        current.session_version !== actor.sessionVersion
      )
        throw new ApiError(
          403,
          "Your administrator access has changed. Sign in again.",
        );
      if (current.password_change_required && !allowPasswordChange)
        throw new ApiError(428, "Replace your setup password first.");
      return callback(client, current);
    });
  }
  async function list(section, { search = "", filter = "all", page = 1 } = {}) {
    const definitions = {
      users: {
        from: "users u",
        fields:
          "u.id,u.username,u.email,u.role,u.account_status,u.created_at,(SELECT count(*)::int FROM listings l WHERE l.seller_id=u.id) AS listing_count",
        search: ["u.username", "u.email"],
        filters: {
          active: "u.account_status='active'",
          suspended: "u.account_status='suspended'",
          admin: "u.role='admin'",
        },
        date: "u.created_at",
        id: "u.id",
      },
      listings: {
        from: "listings l JOIN users u ON u.id=l.seller_id",
        fields:
          "l.*,u.username AS seller_name,u.account_status AS seller_status",
        search: ["l.title", "u.username"],
        filters: {
          visible: "l.moderation_status='visible' AND l.status<>'removed'",
          hidden: "l.moderation_status='hidden'",
          available: "l.status='available'",
          reserved: "l.status='reserved'",
          sold: "l.status='sold'",
          removed: "l.status='removed'",
        },
        date: "l.created_at",
        id: "l.id",
      },
      orders: {
        from: "orders o JOIN users b ON b.id=o.buyer_id JOIN users s ON s.id=o.seller_id",
        fields:
          "o.id,o.snapshot_title,o.snapshot_platform,o.snapshot_price_paise,o.status,o.payment_status,o.payment_provider,o.payment_mode,o.created_at,b.username AS buyer_name,s.username AS seller_name",
        search: ["o.snapshot_title", "b.username", "s.username", "o.id::text"],
        filters: {
          pending: "o.status='pending'",
          confirmed: "o.status='confirmed'",
          completed: "o.status='completed'",
          cancelled: "o.status='cancelled'",
        },
        date: "o.created_at",
        id: "o.id",
      },
      activity: {
        from: "admin_audit a JOIN users u ON u.id=a.actor_id",
        fields: "a.*,u.username AS actor_name",
        search: ["a.action", "a.reason", "u.username", "a.entity_id::text"],
        filters: {
          user: "a.entity_type='user'",
          listing: "a.entity_type='listing'",
          order: "a.entity_type='order'",
          security: "a.entity_type='security'",
        },
        date: "a.created_at",
        id: "a.id",
      },
    };
    const d = Object.hasOwn(definitions, section) ? definitions[section] : null;
    if (!d) throw new ApiError(404, "Unknown administration section.");
    const params = [],
      where = [];
    if (search) {
      params.push(`%${search.replace(/[\\%_]/g, "\\$&")}%`);
      where.push(
        `(${d.search.map((field) => `${field} ILIKE $1`).join(" OR ")})`,
      );
    }
    if (d.filters[filter]) where.push(d.filters[filter]);
    const condition = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = Number(
      (
        await db.query(
          `SELECT count(*) AS total FROM ${d.from} ${condition}`,
          params,
        )
      ).rows[0].total,
    );
    const currentPage = Math.min(page, Math.max(1, Math.ceil(total / 20)));
    params.push((currentPage - 1) * 20);
    const { rows } = await db.query(
      `SELECT ${d.fields} FROM ${d.from} ${condition} ORDER BY ${d.date} DESC,${d.id} LIMIT 20 OFFSET $${params.length}`,
      params,
    );
    return {
      rows,
      total,
      page: currentPage,
      pages: Math.max(1, Math.ceil(total / 20)),
    };
  }
  return {
    list,
    async overview() {
      const [counts, trend, recent] = await Promise.all([
        db.query(`SELECT (SELECT count(*)::int FROM users) AS users, (SELECT count(*)::int FROM users WHERE account_status='suspended') AS suspended_users,
          (SELECT count(*)::int FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.status='available' AND l.moderation_status='visible' AND u.account_status='active') AS available_listings,
          (SELECT count(*)::int FROM listings WHERE moderation_status='hidden') AS hidden_listings,
          (SELECT count(*)::int FROM orders) AS orders, (SELECT count(*)::int FROM orders WHERE status='pending') AS pending_orders,
          (SELECT COALESCE(sum(snapshot_price_paise),0)::text FROM orders WHERE payment_status='paid' AND status IN ('confirmed','completed')) AS paid_volume`),
        db.query(`WITH days AS (SELECT generate_series((now() AT TIME ZONE 'Asia/Kolkata')::date-13,(now() AT TIME ZONE 'Asia/Kolkata')::date,interval '1 day')::date AS day)
          SELECT to_char(day,'YYYY-MM-DD') AS day,
            (SELECT count(*)::int FROM users WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date=day) AS users,
            (SELECT count(*)::int FROM listings WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date=day) AS listings,
            (SELECT count(*)::int FROM orders WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date=day) AS orders FROM days ORDER BY day`),
        list("activity"),
      ]);
      return {
        counts: counts.rows[0],
        trend: trend.rows,
        recent: recent.rows.slice(0, 5),
        services: {
          database: "Connected",
          newGames: "Steam redirects",
          payments: "Disabled — provider setup pending",
          uploads: process.env.BLOB_READ_WRITE_TOKEN
            ? "Configured"
            : "Not configured",
        },
      };
    },
    async detail(section, id) {
      validateId(id);
      if (section !== "orders") throw new ApiError(404, "Unknown detail view.");
      const row = (
        await db.query(
          `SELECT o.*,b.username AS buyer_name,b.email AS buyer_email,s.username AS seller_name,s.email AS seller_email FROM orders o JOIN users b ON b.id=o.buyer_id JOIN users s ON s.id=o.seller_id WHERE o.id=$1`,
          [id],
        )
      ).rows[0];
      if (!row) throw new ApiError(404, "Order not found.");
      return row;
    },
    async mutate(actor, section, id, input) {
      id = validateId(id).toLowerCase();
      const reason = reasonInput(input.reason);
      return transaction(actor, async (client, current) => {
        if (section === "users") {
          const target = (
            await client.query(
              "SELECT id,role,account_status,session_version FROM users WHERE id=$1 FOR UPDATE",
              [id],
            )
          ).rows[0];
          if (!target) throw new ApiError(404, "User not found.");
          if (id === actor._id)
            throw new ApiError(
              400,
              "You cannot change your own role or account status here.",
            );
          const actions = {
            suspend: ["account_status", "suspended"],
            reactivate: ["account_status", "active"],
            promote: ["role", "admin"],
            demote: ["role", "user"],
          };
          const change = Object.hasOwn(actions, input.action)
            ? actions[input.action]
            : null;
          if (!change) throw new ApiError(400, "Choose a valid user action.");
          if (change[0] === "role") {
            if (
              typeof input.password !== "string" ||
              input.password.length > 100 ||
              !(await bcrypt.compare(input.password, current.password_hash))
            )
              throw new ApiError(
                403,
                "Confirm your current password to change administrator access.",
              );
          }
          if (
            target.role === "admin" &&
            target.account_status === "active" &&
            (input.action === "suspend" || input.action === "demote")
          ) {
            const count = Number(
              (
                await client.query(
                  "SELECT count(*) FROM users WHERE role='admin' AND account_status='active'",
                )
              ).rows[0].count,
            );
            if (count <= 1)
              throw new ApiError(
                409,
                "The last active administrator cannot be removed.",
              );
          }
          if (target[change[0]] === change[1]) return { unchanged: true };
          await client.query(
            `UPDATE users SET ${change[0]}=$2,session_version=session_version+1 WHERE id=$1`,
            [id, change[1]],
          );
          await audit(
            client,
            actor,
            `user.${input.action}`,
            "user",
            id,
            reason,
            stateOf(target, ["role", "account_status"]),
            {
              ...stateOf(target, ["role", "account_status"]),
              [change[0]]: change[1],
            },
          );
        } else if (section === "listings") {
          if (!["hide", "restore"].includes(input.action))
            throw new ApiError(400, "Choose hide or restore.");
          const row = (
            await client.query(
              "SELECT id,status,moderation_status FROM listings WHERE id=$1 FOR UPDATE",
              [id],
            )
          ).rows[0];
          if (!row) throw new ApiError(404, "Listing not found.");
          const next = input.action === "hide" ? "hidden" : "visible";
          if (row.moderation_status === next) return { unchanged: true };
          await client.query(
            "UPDATE listings SET moderation_status=$2,moderation_reason=$3 WHERE id=$1",
            [id, next, reason],
          );
          await audit(
            client,
            actor,
            `listing.${input.action}`,
            "listing",
            id,
            reason,
            { moderation_status: row.moderation_status },
            { moderation_status: next },
          );
        } else if (section === "orders") {
          const target = (
            await client.query("SELECT listing_id FROM orders WHERE id=$1", [
              id,
            ])
          ).rows[0];
          if (!target) throw new ApiError(404, "Order not found.");
          // Match checkout's listing -> order lock ordering.
          await client.query("SELECT id FROM listings WHERE id=$1 FOR UPDATE", [
            target.listing_id,
          ]);
          const row = (
            await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
              id,
            ])
          ).rows[0];
          if (
            input.action === "cancel" &&
            row.status === "pending" &&
            row.payment_status === "pending" &&
            !row.provider_order_id
          ) {
            await client.query(
              "UPDATE orders SET status='cancelled',payment_status='failed' WHERE id=$1",
              [id],
            );
            await client.query(
              "UPDATE listings SET status='available' WHERE id=$1 AND status='reserved'",
              [row.listing_id],
            );
            await audit(
              client,
              actor,
              "order.cancel",
              "order",
              id,
              reason,
              { status: row.status },
              { status: "cancelled" },
            );
          } else if (
            input.action === "complete" &&
            row.status === "confirmed" &&
            row.payment_status === "paid"
          ) {
            await client.query(
              "UPDATE orders SET status='completed' WHERE id=$1",
              [id],
            );
            await audit(
              client,
              actor,
              "order.complete",
              "order",
              id,
              reason,
              { status: row.status },
              { status: "completed" },
            );
          } else
            throw new ApiError(
              409,
              "This order cannot make that transition. Provider-linked payments must be resolved with the payment provider.",
            );
        } else throw new ApiError(404, "Unknown administration action.");
        return { unchanged: false };
      });
    },
    async changePassword(actor, input) {
      const password = validateNewPassword(input.newPassword);
      if (password !== input.confirmPassword)
        throw new ApiError(400, "New passwords do not match.");
      return transaction(
        actor,
        async (client, current) => {
          if (
            typeof input.currentPassword !== "string" ||
            input.currentPassword.length > 100 ||
            !(await bcrypt.compare(
              input.currentPassword,
              current.password_hash,
            ))
          )
            throw new ApiError(400, "Your current password is incorrect.");
          if (await bcrypt.compare(password, current.password_hash))
            throw new ApiError(400, "Choose a different password.");
          const hash = await bcrypt.hash(password, 12);
          const user = (
            await client.query(
              "UPDATE users SET password_hash=$2,password_change_required=false,session_version=session_version+1 WHERE id=$1 RETURNING id,username,email,avatar,created_at,role,session_version,password_change_required",
              [actor._id, hash],
            )
          ).rows[0];
          await audit(
            client,
            actor,
            "security.password_changed",
            "security",
            actor._id,
            "Administrator changed their password; previous sessions revoked.",
            {},
            {},
          );
          return user;
        },
        true,
      );
    },
  };
}
