import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { applyMigrations } from "../scripts/db-migrate.mjs";

// Explicit opt-in only. Every table, function, and fixture is created in a unique
// schema inside one transaction, which is rolled back even on assertion failure.
test(
  "PostgreSQL migrations and marketplace invariants",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const client = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    });
    await client.connect();
    const schema = `questmart_test_${randomUUID().replaceAll("-", "")}`;
    let transactionOpen = false;
    try {
      await client.query("BEGIN");
      transactionOpen = true;
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      assert.deepEqual(await applyMigrations(client), [
        "001_initial.sql",
        "002_marketplace.sql",
        "003_admin.sql",
        "004_audit_permissions.sql",
      ]);
      assert.deepEqual(await applyMigrations(client), []);

      async function rejectsSql(sql, params, code) {
        await client.query("SAVEPOINT expected_failure");
        try {
          await assert.rejects(
            client.query(sql, params),
            (error) => error.code === code,
          );
        } finally {
          await client.query("ROLLBACK TO SAVEPOINT expected_failure");
          await client.query("RELEASE SAVEPOINT expected_failure");
        }
      }

      const passwordHash = "$2a$10$" + "a".repeat(53);
      const users = await client.query(
        `INSERT INTO users (username,email,password_hash)
      VALUES ('seller','seller@example.com',$1),('buyer','buyer@example.com',$1),('other','other@example.com',$1)
      RETURNING id,username`,
        [passwordHash],
      );
      const ids = Object.fromEntries(
        users.rows.map((row) => [row.username, row.id]),
      );

      await t.test("users enforce normalized unique identities", async () => {
        await rejectsSql(
          "INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3)",
          ["seller", "duplicate@example.com", passwordHash],
          "23505",
        );
        await rejectsSql(
          "INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3)",
          ["Uppercase", "upper@example.com", passwordHash],
          "23514",
        );
      });

      const {
        rows: [listing],
      } = await client.query(
        `INSERT INTO listings
      (seller_id,title,platform,format,condition,price_paise,description,photos)
      VALUES ($1,'GTA V','PS4','disc','good',80000,'Used game with its original case.',ARRAY['https://example.com/game.jpg'])
      RETURNING *`,
        [ids.seller],
      );
      await t.test(
        "listings validate money, photos and owner identity",
        async () => {
          assert.equal(listing.currency, "INR");
          assert.equal(listing.status, "available");
          await rejectsSql(
            "UPDATE listings SET price_paise = -1 WHERE id=$1",
            [listing.id],
            "23514",
          );
          await rejectsSql(
            "UPDATE listings SET photos=ARRAY[]::text[] WHERE id=$1",
            [listing.id],
            "23514",
          );
          await rejectsSql(
            "UPDATE listings SET photos=ARRAY['http://example.com/a.jpg'] WHERE id=$1",
            [listing.id],
            "23514",
          );
          await rejectsSql(
            "UPDATE listings SET seller_id=$1 WHERE id=$2",
            [ids.other, listing.id],
            "23514",
          );
        },
      );

      const orderSql = `INSERT INTO orders
      (buyer_id,seller_id,listing_id,snapshot_title,snapshot_platform,snapshot_format,snapshot_condition,snapshot_price_paise,snapshot_photo)
      VALUES ($1,$2,$3,'GTA V','PS4','disc','good',80000,'https://example.com/game.jpg') RETURNING *`;
      await t.test(
        "orders reject self purchase and incorrect listing seller",
        async () => {
          await rejectsSql(
            orderSql,
            [ids.seller, ids.seller, listing.id],
            "23514",
          );
          await rejectsSql(
            orderSql,
            [ids.buyer, ids.other, listing.id],
            "23503",
          );
        },
      );
      const {
        rows: [order],
      } = await client.query(orderSql, [ids.buyer, ids.seller, listing.id]);
      await t.test(
        "orders are test-only with immutable snapshots and one active order per copy",
        async () => {
          assert.equal(order.payment_mode, "test");
          assert.equal(order.status, "pending");
          assert.equal(order.payment_status, "pending");
          await rejectsSql(
            "UPDATE orders SET snapshot_price_paise=100 WHERE id=$1",
            [order.id],
            "23514",
          );
          await rejectsSql(
            "UPDATE orders SET payment_mode='live' WHERE id=$1",
            [order.id],
            "23514",
          );
          await rejectsSql(
            orderSql,
            [ids.other, ids.seller, listing.id],
            "23505",
          );
          await client.query(
            "UPDATE orders SET status='cancelled' WHERE id=$1",
            [order.id],
          );
          const replacement = await client.query(orderSql, [
            ids.other,
            ids.seller,
            listing.id,
          ]);
          assert.equal(replacement.rows[0].buyer_id, ids.other);
        },
      );
      await t.test(
        "migration ledger rejects edited applied migrations",
        async () => {
          await client.query("SAVEPOINT ledger_test");
          try {
            await client.query(
              "UPDATE schema_migrations SET checksum='tampered'",
            );
            await assert.rejects(
              applyMigrations(client),
              /changed after it was applied/,
            );
          } finally {
            await client.query("ROLLBACK TO SAVEPOINT ledger_test");
            await client.query("RELEASE SAVEPOINT ledger_test");
          }
        },
      );
      await t.test(
        "all integration fixtures disappear on rollback",
        async () => {
          await client.query("ROLLBACK");
          transactionOpen = false;
          const {
            rows: [result],
          } = await client.query(
            "SELECT to_regnamespace($1) IS NULL AS removed",
            [schema],
          );
          assert.equal(result.removed, true);
        },
      );
    } finally {
      try {
        if (transactionOpen) await client.query("ROLLBACK");
      } finally {
        await client.end();
      }
    }
  },
);
