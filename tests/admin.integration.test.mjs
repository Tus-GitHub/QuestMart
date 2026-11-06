import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import { applyMigrations } from "../scripts/db-migrate.mjs";
import { createAdminService } from "../lib/admin.mjs";
import { createMarketplace } from "../lib/marketplace.mjs";
import { requireUser, createSessionToken } from "../lib/auth.mjs";

test(
  "admin transactions, authorization, moderation and audit invariants",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const client = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
      connectionTimeoutMillis: 15000,
    });
    await client.connect();
    const password = "integration-admin-password-only";
    try {
      await client.query("BEGIN");
      const schema = `admin_test_${randomUUID().replaceAll("-", "")}`;
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await applyMigrations(client);
      const db = {
        query: client.query.bind(client),
        withTransaction: async (callback) => {
          await client.query("SAVEPOINT admin_action");
          try {
            const value = await callback(client);
            await client.query("RELEASE SAVEPOINT admin_action");
            return value;
          } catch (error) {
            await client.query("ROLLBACK TO SAVEPOINT admin_action");
            await client.query("RELEASE SAVEPOINT admin_action");
            throw error;
          }
        },
      };
      const admin = createAdminService(db),
        marketplace = createMarketplace(db);
      const hash = await bcrypt.hash(password, 12);
      const users = (
        await client.query(
          `INSERT INTO users(username,email,password_hash,role,email_verification_required) VALUES('operator','operator@example.test',$1,'admin',false),('seller','seller@example.test',$1,'user',false),('buyer','buyer@example.test',$1,'user',false) RETURNING id,username`,
          [hash],
        )
      ).rows;
      const ids = Object.fromEntries(users.map((u) => [u.username, u.id]));
      const actor = { _id: ids.operator, sessionVersion: 0 };
      const photo = "https://example.test/owned-photo.jpg";
      await client.query(
        "INSERT INTO uploads(owner_id,url,size_bytes) VALUES($1,$2,1000)",
        [ids.seller, photo],
      );
      const input = {
        title: "Elden Ring",
        platform: "PS5",
        format: "disc",
        condition: "good",
        pricePaise: 120000,
        description: "A physical copy with its original case.",
        photos: [photo],
      };
      const listing = await marketplace.create(ids.seller, input);
      await t.test(
        "non-admin actors cannot mutate and signup defaults remain unprivileged",
        async () => {
          await assert.rejects(
            admin.mutate(
              { _id: ids.seller, sessionVersion: 0 },
              "listings",
              listing.id,
              { action: "hide", reason: "Testing moderation" },
            ),
            (e) => e.status === 403,
          );
          assert.equal(
            (
              await client.query("SELECT role FROM users WHERE id=$1", [
                ids.seller,
              ])
            ).rows[0].role,
            "user",
          );
        },
      );
      await t.test(
        "hidden listings leave public queries and sellers cannot bypass the hold",
        async () => {
          await admin.mutate(actor, "listings", listing.id, {
            action: "hide",
            reason: "Photo review required",
          });
          assert.equal((await marketplace.list()).listings.length, 0);
          await assert.rejects(
            marketplace.detail(listing.id),
            (e) => e.status === 404,
          );
          await marketplace.update(ids.seller, listing.id, {
            ...input,
            title: "Updated title",
          });
          assert.equal((await marketplace.list()).listings.length, 0);
          assert.equal(
            (await marketplace.list({ mine: ids.seller })).listings[0]
              .moderation_status,
            "hidden",
          );
          await admin.mutate(actor, "listings", listing.id, {
            action: "restore",
            reason: "Photos verified",
          });
          assert.equal((await marketplace.list()).listings.length, 1);
          assert.equal((await admin.list("activity")).total, 2);
        },
      );
      await t.test(
        "suspension hides seller inventory and permanently invalidates the old session",
        async () => {
          process.env.JWT_SECRET =
            "integration-only-signing-key-for-admin-tests";
          const request = new Request("https://questmart.test/", {
            headers: {
              cookie: `accessToken=${createSessionToken(ids.seller)}`,
            },
          });
          await admin.mutate(actor, "users", ids.seller, {
            action: "suspend",
            reason: "Review account",
          });
          assert.equal((await marketplace.list()).listings.length, 0);
          await assert.rejects(
            requireUser(request, db),
            (e) => e.status === 401,
          );
          await admin.mutate(actor, "users", ids.seller, {
            action: "reactivate",
            reason: "Review complete",
          });
          await assert.rejects(
            requireUser(request, db),
            (e) => e.status === 401,
          );
          assert.equal((await marketplace.list()).listings.length, 1);
        },
      );
      await t.test(
        "self lockout, arbitrary actions and missing reauthentication are rejected",
        async () => {
          await assert.rejects(
            admin.mutate(actor, "users", actor._id, {
              action: "demote",
              reason: "Self change",
              password,
            }),
            (e) => e.status === 400,
          );
          await assert.rejects(
            admin.mutate(actor, "users", ids.buyer, {
              action: "promote",
              reason: "New operator",
              password: "wrong",
            }),
            (e) => e.status === 403,
          );
          await assert.rejects(
            admin.mutate(actor, "users", ids.buyer, {
              action: "delete",
              reason: "Bad action",
            }),
            (e) => e.status === 400,
          );
          await admin.mutate(actor, "users", ids.buyer, {
            action: "promote",
            reason: "New operator",
            password,
          });
          await assert.rejects(
            admin.mutate(actor, "users", actor._id.toUpperCase(), { action: "demote", reason: "Case-insensitive self-lockout check", password }),
            (e) => e.status === 400,
          );
          await admin.mutate(actor, "users", ids.buyer, {
            action: "demote",
            reason: "Access removed",
            password,
          });
        },
      );
      let order;
      await t.test(
        "unpaid cancellation releases inventory but cannot fabricate a paid order",
        async () => {
          order = (
            await client.query(
              `INSERT INTO orders(buyer_id,seller_id,listing_id,snapshot_title,snapshot_platform,snapshot_format,snapshot_condition,snapshot_price_paise,snapshot_photo) VALUES($1,$2,$3,'Elden Ring','PS5','disc','good',120000,$4) RETURNING *`,
              [ids.buyer, ids.seller, listing.id, photo],
            )
          ).rows[0];
          await client.query(
            "UPDATE listings SET status='reserved' WHERE id=$1",
            [listing.id],
          );
          await assert.rejects(
            admin.mutate(actor, "orders", order.id, {
              action: "complete",
              reason: "Invalid completion",
            }),
            (e) => e.status === 409,
          );
          await assert.rejects(
            admin.mutate(actor, "orders", order.id, {
              action: "paid",
              reason: "Invalid payment",
            }),
            (e) => e.status === 409,
          );
          await client.query(
            "UPDATE orders SET provider_order_id='order_provider_reserved' WHERE id=$1",
            [order.id],
          );
          await assert.rejects(
            admin.mutate(actor, "orders", order.id, {
              action: "cancel",
              reason: "Unsafe cancellation",
            }),
            (e) => e.status === 409,
          );
          await client.query(
            "UPDATE orders SET provider_order_id=NULL WHERE id=$1",
            [order.id],
          );
          await admin.mutate(actor, "orders", order.id, {
            action: "cancel",
            reason: "Abandoned unpaid order",
          });
          assert.equal(
            (await marketplace.detail(listing.id)).status,
            "available",
          );
          assert.equal(
            (await admin.detail("orders", order.id)).status,
            "cancelled",
          );
          await assert.rejects(
            admin.mutate(actor, "orders", order.id, {
              action: "cancel",
              reason: "Duplicate cancellation",
            }),
            (e) => e.status === 409,
          );
        },
      );
      await t.test(
        "paid confirmed orders can complete without altering the payment snapshot",
        async () => {
          await client.query(
            "UPDATE orders SET status='confirmed',payment_status='paid' WHERE id=$1",
            [order.id],
          );
          await client.query("UPDATE listings SET status='sold' WHERE id=$1", [
            listing.id,
          ]);
          await admin.mutate(actor, "orders", order.id, {
            action: "complete",
            reason: "Delivery confirmed",
          });
          const updated = await admin.detail("orders", order.id);
          assert.equal(updated.status, "completed");
          assert.equal(updated.payment_status, "paid");
          assert.equal(updated.snapshot_price_paise, 120000);
        },
      );
      await t.test(
        "search, counts and pagination are bounded and exclude password hashes",
        async () => {
          const results = await admin.list("users", { search: "%", page: 1 });
          assert.equal(results.total, 0);
          assert.equal(
            JSON.stringify(await admin.list("users")).includes("password_hash"),
            false,
          );
          const overview = await admin.overview();
          assert.equal(overview.counts.users, 3);
          assert.equal(overview.trend.length, 14);
          assert.equal(Number(overview.counts.paid_volume), 120000);
        },
      );
      await t.test(
        "password rotation revokes sessions and never stores credentials in the audit log",
        async () => {
          await assert.rejects(
            admin.changePassword(actor, {
              currentPassword: "wrong",
              newPassword: "new-password-for-integration",
              confirmPassword: "new-password-for-integration",
            }),
            (e) => e.status === 400,
          );
          const next = await admin.changePassword(actor, {
            currentPassword: password,
            newPassword: "new-password-for-integration",
            confirmPassword: "new-password-for-integration",
          });
          assert.equal(next.session_version, 1);
          assert.equal(next.password_change_required, false);
          await assert.rejects(
            admin.mutate(actor, "listings", listing.id, {
              action: "hide",
              reason: "Stale operator",
            }),
            (e) => e.status === 403,
          );
          const log = JSON.stringify((await admin.list("activity")).rows);
          assert.equal(log.includes(password), false);
          assert.equal(log.includes("new-password-for-integration"), false);
        },
      );
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  },
);
