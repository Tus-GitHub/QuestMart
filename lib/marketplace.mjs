import { ApiError } from "./http.mjs";
import { validateListingInput, PLATFORMS } from "./listing-validation.mjs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateId(value) {
  if (!uuidPattern.test(value || ""))
    throw new ApiError(400, "Invalid item identifier.");
  return value;
}
export function listingInput(body) {
  const parsed = validateListingInput(body);
  if (!parsed.success) throw new ApiError(400, Object.values(parsed.errors)[0]);
  return parsed.data;
}
export function shippingInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "Add your delivery details.");
  const output = {};
  for (const [key, min, max] of [
    ["name", 2, 80],
    ["address", 5, 200],
    ["city", 2, 80],
    ["state", 2, 80],
    ["postalCode", 6, 6],
    ["phone", 10, 15],
  ]) {
    const text = typeof value[key] === "string" ? value[key].trim() : "";
    if (text.length < min || text.length > max)
      throw new ApiError(
        400,
        `Check your ${key.replace("postalCode", "PIN code")}.`,
      );
    output[key] = text;
  }
  if (
    !/^\d{6}$/.test(output.postalCode) ||
    !/^\+?[0-9 -]{10,15}$/.test(output.phone)
  )
    throw new ApiError(400, "Enter a valid PIN code and phone number.");
  return output;
}
const selectListing = `SELECT l.*, u.username AS seller_name FROM listings l JOIN users u ON u.id=l.seller_id`;

// Dependency injection allows the same transactions to be exercised against an
// isolated PostgreSQL schema. Price, seller and order state are never client-owned.
export function createMarketplace(db) {
  async function validatePhotos(client, userId, photos) {
    const unique = [...new Set(photos)];
    const {
      rows: [result],
    } = await client.query(
      "SELECT count(*)::integer AS count FROM uploads WHERE owner_id=$1 AND url=ANY($2::text[])",
      [userId, unique],
    );
    if (result.count !== unique.length)
      throw new ApiError(
        400,
        "Upload your own photos before publishing this listing.",
      );
  }
  async function lockListing(client, id) {
    const {
      rows: [listing],
    } = await client.query("SELECT * FROM listings WHERE id=$1 FOR UPDATE", [
      validateId(id),
    ]);
    if (!listing) throw new ApiError(404, "This listing could not be found.");
    // All competing operations acquire the physical copy's lock first.
    const expired = await client.query(
      `UPDATE orders SET status='cancelled',payment_status='failed'
      WHERE listing_id=$1 AND status='pending' AND expires_at<=now() RETURNING id`,
      [id],
    );
    if (expired.rowCount && listing.status === "reserved") {
      await client.query("UPDATE listings SET status='available' WHERE id=$1", [
        id,
      ]);
      listing.status = "available";
    }
    return listing;
  }
  return {
    async list({
      search = "",
      platform = "",
      sort = "newest",
      mine = null,
      page = 1,
    } = {}) {
      const params = [],
        clauses = [];
      const add = (value) => {
        params.push(value);
        return `$${params.length}`;
      };
      if (mine)
        clauses.push(`l.seller_id=${add(mine)} AND l.status<>'removed'`);
      else
        clauses.push(`l.moderation_status='visible' AND u.account_status='active' AND (l.status='available' OR (l.status='reserved' AND EXISTS (
        SELECT 1 FROM orders o WHERE o.listing_id=l.id AND o.status='pending' AND o.expires_at<=now())))`);
      if (search)
        clauses.push(
          `l.title ILIKE ${add("%" + search.slice(0, 120).replace(/[\\%_]/g, "\\$&") + "%")}`,
        );
      if (platform && PLATFORMS.includes(platform))
        clauses.push(`l.platform=${add(platform)}`);
      const order =
        {
          newest: "l.created_at DESC",
          price_asc: "l.price_paise ASC",
          price_desc: "l.price_paise DESC",
        }[sort] || "l.created_at DESC";
      const offset = (Math.max(1, Math.min(Number(page) || 1, 1000)) - 1) * 24;
      const { rows } = await db.query(
        `${selectListing} WHERE ${clauses.join(" AND ")} ORDER BY ${order},l.id LIMIT 25 OFFSET ${add(offset)}`,
        params,
      );
      return { listings: rows.slice(0, 24), hasMore: rows.length > 24 };
    },
    async detail(id) {
      const {
        rows: [listing],
      } = await db.query(
        `${selectListing} WHERE l.id=$1 AND l.status<>'removed' AND l.moderation_status='visible' AND u.account_status='active'`,
        [validateId(id)],
      );
      if (!listing)
        throw new ApiError(404, "This listing is no longer available.");
      return listing;
    },
    async create(userId, input) {
      const d = listingInput(input);
      await validatePhotos(db, userId, d.photos);
      const {
        rows: [listing],
      } = await db.query(
        `INSERT INTO listings(seller_id,title,platform,format,condition,price_paise,description,photos,rawg_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          userId,
          d.title,
          d.platform,
          d.format,
          d.condition,
          d.pricePaise,
          d.description,
          d.photos,
          d.rawgId ?? null,
        ],
      );
      return listing;
    },
    async update(userId, id, input) {
      const d = listingInput(input);
      return db.withTransaction(async (client) => {
        const listing = await lockListing(client, id);
        if (listing.seller_id !== userId)
          throw new ApiError(403, "You can only edit your own listings.");
        if (listing.status !== "available")
          throw new ApiError(
            409,
            "A reserved or sold listing cannot be edited.",
          );
        await validatePhotos(client, userId, d.photos);
        const {
          rows: [updated],
        } = await client.query(
          `UPDATE listings SET title=$2,platform=$3,format=$4,condition=$5,price_paise=$6,description=$7,photos=$8,rawg_id=$9 WHERE id=$1 RETURNING *`,
          [
            id,
            d.title,
            d.platform,
            d.format,
            d.condition,
            d.pricePaise,
            d.description,
            d.photos,
            d.rawgId ?? null,
          ],
        );
        return updated;
      });
    },
    async remove(userId, id) {
      return db.withTransaction(async (client) => {
        const listing = await lockListing(client, id);
        if (listing.seller_id !== userId)
          throw new ApiError(403, "You can only remove your own listings.");
        if (listing.status === "removed") return;
        if (listing.status !== "available")
          throw new ApiError(
            409,
            "A reserved or sold listing cannot be removed.",
          );
        await client.query("UPDATE listings SET status='removed' WHERE id=$1", [
          id,
        ]);
      });
    },
    async checkout(userId, input) {
      const id = validateId(input.listingId),
        key = validateId(input.checkoutKey),
        shipping = shippingInput(input.shipping);
      return db.withTransaction(async (client) => {
        const listing = await lockListing(client, id);
        const {
          rows: [existing],
        } = await client.query(
          "SELECT * FROM orders WHERE buyer_id=$1 AND checkout_key=$2",
          [userId, key],
        );
        if (existing) {
          if (existing.listing_id !== id)
            throw new ApiError(
              409,
              "This checkout key belongs to another item.",
            );
          return existing;
        }
        if (listing.seller_id === userId)
          throw new ApiError(400, "You cannot purchase your own listing.");
        const seller = (
          await client.query("SELECT account_status FROM users WHERE id=$1", [
            listing.seller_id,
          ])
        ).rows[0];
        if (
          listing.moderation_status !== "visible" ||
          seller?.account_status !== "active"
        )
          throw new ApiError(409, "This listing is unavailable.");
        if (listing.status !== "available")
          throw new ApiError(
            409,
            "Another player has already reserved this copy.",
          );
        const {
          rows: [order],
        } = await client.query(
          `INSERT INTO orders(buyer_id,seller_id,listing_id,snapshot_title,snapshot_platform,snapshot_format,snapshot_condition,snapshot_price_paise,snapshot_photo,checkout_key,shipping_address,payment_provider)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'simulator') RETURNING *`,
          [
            userId,
            listing.seller_id,
            id,
            listing.title,
            listing.platform,
            listing.format,
            listing.condition,
            listing.price_paise,
            listing.photos[0],
            key,
            JSON.stringify(shipping),
          ],
        );
        await client.query(
          "UPDATE listings SET status='reserved' WHERE id=$1",
          [id],
        );
        return order;
      });
    },
    async settle(userId, id, outcome) {
      validateId(id);
      if (!["success", "failure", "cancel"].includes(outcome))
        throw new ApiError(400, "Choose a valid test payment result.");
      const {
        rows: [target],
      } = await db.query(
        "SELECT listing_id FROM orders WHERE id=$1 AND buyer_id=$2",
        [id, userId],
      );
      if (!target) throw new ApiError(404, "Order not found.");
      return db.withTransaction(async (client) => {
        await lockListing(client, target.listing_id);
        const {
          rows: [order],
        } = await client.query(
          "SELECT * FROM orders WHERE id=$1 AND buyer_id=$2 FOR UPDATE",
          [id, userId],
        );
        if (
          order.payment_mode !== "test" ||
          order.payment_provider !== "simulator"
        )
          throw new ApiError(
            409,
            "This payment must be completed with its provider.",
          );
        if (order.status !== "pending") return order;
        const success = outcome === "success";
        const {
          rows: [updated],
        } = await client.query(
          `UPDATE orders SET status=$2,payment_status=$3,paid_at=CASE WHEN $4 THEN now() ELSE NULL END,provider_payment_id=$5 WHERE id=$1 RETURNING *`,
          [
            id,
            success ? "confirmed" : "cancelled",
            success ? "paid" : "failed",
            success,
            success ? `test_${id}` : null,
          ],
        );
        await client.query("UPDATE listings SET status=$2 WHERE id=$1", [
          order.listing_id,
          success ? "sold" : "available",
        ]);
        return updated;
      });
    },
    async orders(userId) {
      const { rows } = await db.query(
        `SELECT o.*,buyer.username AS buyer_name,seller.username AS seller_name FROM orders o JOIN users buyer ON buyer.id=o.buyer_id JOIN users seller ON seller.id=o.seller_id
        WHERE o.buyer_id=$1 OR o.seller_id=$1 ORDER BY o.created_at DESC LIMIT 100`,
        [userId],
      );
      return rows;
    },
    async order(userId, id) {
      const {
        rows: [order],
      } = await db.query(
        `SELECT o.*,buyer.username AS buyer_name,seller.username AS seller_name FROM orders o JOIN users buyer ON buyer.id=o.buyer_id JOIN users seller ON seller.id=o.seller_id
        WHERE o.id=$1 AND (o.buyer_id=$2 OR o.seller_id=$2)`,
        [validateId(id), userId],
      );
      if (!order) throw new ApiError(404, "Order not found.");
      return order;
    },
  };
}
