import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { LOCAL_DATABASE, databaseUrl, updateEnvironmentContents, validateLocalConfig } from "../scripts/db-local.mjs";

const dataDirectory = path.resolve("test-workspace", ".local", "postgres");
const config = { ...LOCAL_DATABASE, dataDirectory, password: "a".repeat(43) };

test("local configuration is restricted to the isolated loopback cluster", () => {
    assert.equal(validateLocalConfig(config, dataDirectory), config);
    for (const [key, value] of [
        ["host", "0.0.0.0"],
        ["port", 5432],
        ["database", "existing_database"],
        ["user", "postgres"],
        ["dataDirectory", path.resolve("different-cluster")],
        ["password", "password\nmalformed"],
    ]) {
        assert.throws(() => validateLocalConfig({ ...config, [key]: value }, dataDirectory));
    }
});

test("database URL contains only the configured local connection", () => {
    const url = new URL(databaseUrl(config));
    assert.equal(url.protocol, "postgresql:");
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.port, "55432");
    assert.equal(url.pathname, "/questmart_demo");
    assert.equal(url.username, "questmart_local");
    assert.equal(url.password, config.password);
});

test("environment migration preserves JWT, RAWG and comments while replacing obsolete database settings", () => {
    const previous = [
        "# Keep this comment",
        "JWT_SECRET=example-only-not-a-real-secret",
        "NEXT_PUBLIC_ROWG_KEY=example-only",
        'NEXT_PUBLIC_DATABASE_URL="obsolete"',
        "MONGODB_URI=obsolete",
        'export DATABASE_URL="old-postgres-value"',
        " DATABASE_URL =duplicate",
        "",
    ].join("\r\n");
    const next = updateEnvironmentContents(previous, databaseUrl(config));
    assert.ok(next.includes("# Keep this comment\r\n"));
    assert.ok(next.includes("JWT_SECRET=example-only-not-a-real-secret\r\n"));
    assert.ok(next.includes("NEXT_PUBLIC_ROWG_KEY=example-only\r\n"));
    assert.ok(!next.includes("MONGODB_URI"));
    assert.ok(!next.includes("NEXT_PUBLIC_DATABASE_URL"));
    assert.equal(next.match(/^DATABASE_URL=/gm).length, 1);
    assert.ok(next.endsWith(`DATABASE_URL=${JSON.stringify(databaseUrl(config))}\r\n`));
});

test("environment updates are idempotent and refuse multiline URLs", () => {
    const first = updateEnvironmentContents("JWT_SECRET=example-only\n", databaseUrl(config));
    assert.equal(updateEnvironmentContents(first, databaseUrl(config)), first);
    assert.throws(() => updateEnvironmentContents("", "postgresql://localhost/db\nINJECTED=value"));
});
