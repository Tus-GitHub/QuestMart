import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localDirectory = path.join(projectRoot, ".local");
const dataDirectory = path.join(localDirectory, "postgres");
const configPath = path.join(localDirectory, "postgres-config.json");
const logPath = path.join(localDirectory, "postgres.log");
const envPath = path.join(projectRoot, ".env.local");
const executableExtension = process.platform === "win32" ? ".exe" : "";

export const LOCAL_DATABASE = Object.freeze({
    version: 1,
    host: "127.0.0.1",
    port: 55432,
    user: "questmart_local",
    database: "questmart_demo",
});

function normalizedPath(value) {
    const normalized = path.resolve(value);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function validateLocalConfig(config, expectedDataDirectory = dataDirectory) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("Invalid local PostgreSQL configuration.");
    }
    for (const [key, expected] of Object.entries(LOCAL_DATABASE)) {
        if (config[key] !== expected) throw new Error(`Unexpected local PostgreSQL ${key}.`);
    }
    if (typeof config.dataDirectory !== "string" ||
        normalizedPath(config.dataDirectory) !== normalizedPath(expectedDataDirectory)) {
        throw new Error("The PostgreSQL configuration belongs to a different data directory.");
    }
    if (typeof config.password !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(config.password)) {
        throw new Error("Invalid local PostgreSQL password configuration.");
    }
    return config;
}

export function databaseUrl(config) {
    return `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${encodeURIComponent(config.database)}`;
}

export function updateEnvironmentContents(contents, url) {
    if (/[\r\n]/.test(url)) throw new Error("Database URL must be a single line.");
    const newline = contents.includes("\r\n") ? "\r\n" : "\n";
    const retained = contents.split(/\r?\n/).filter((line) =>
        !/^\s*(?:export\s+)?(?:DATABASE_URL|MONGODB_URI|NEXT_PUBLIC_DATABASE_URL)\s*=/.test(line)
    );
    while (retained.length && retained[retained.length - 1] === "") retained.pop();
    retained.push(`DATABASE_URL=${JSON.stringify(url)}`);
    return retained.join(newline) + newline;
}

async function exists(target) {
    try {
        await fs.access(target);
        return true;
    } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
    }
}

async function refuseSymlink(target) {
    try {
        const info = await fs.lstat(target);
        if (info.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${path.basename(target)}`);
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
}

async function secureFile(target) {
    // Windows access control is inherited; Unix permission bits protect the file elsewhere.
    if (process.platform !== "win32") await fs.chmod(target, 0o600);
}

async function assertWorkspacePaths() {
    await refuseSymlink(localDirectory);
    await refuseSymlink(dataDirectory);
    await refuseSymlink(configPath);
    await refuseSymlink(envPath);
    if (await exists(localDirectory)) {
        const actualRoot = await fs.realpath(projectRoot);
        const actualLocal = await fs.realpath(localDirectory);
        const relative = path.relative(actualRoot, actualLocal);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error("Local database directory must remain inside this workspace.");
        }
    }
}

function run(binary, args, { allowedCodes = [0], environment = {}, finishOnExit = false } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(binary, args, {
            cwd: projectRoot,
            shell: false,
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, ...environment },
        });
        let output = "";
        let errors = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => { output = (output + chunk).slice(-65536); });
        child.stderr.on("data", (chunk) => { errors = (errors + chunk).slice(-65536); });
        child.on("error", reject);
        // Windows pg_ctl can leave pipes inherited by the detached server. Its
        // exit status is final after -w; waiting for all inherited pipes to close
        // would otherwise wait until PostgreSQL itself stops. SQL commands keep
        // the normal close event so their complete output is always collected.
        child.on(finishOnExit ? "exit" : "close", (code) => {
            if (finishOnExit) {
                child.stdout.destroy();
                child.stderr.destroy();
            }
            if (!allowedCodes.includes(code)) {
                // Command arguments and environment variables are deliberately excluded.
                reject(new Error(`${path.basename(binary)} failed (exit ${code}). ${(errors || output).trim()}`));
            } else {
                resolve({ code, output: output.trim(), errors: errors.trim() });
            }
        });
    });
}

async function discoverBinaries() {
    const candidates = process.env.POSTGRES_BIN ? [process.env.POSTGRES_BIN] : [
        ...(process.env.PATH || "").split(path.delimiter).filter(Boolean).map((entry) => entry.replace(/^"|"$/g, "")),
        "C:\\Program Files\\PostgreSQL\\17\\bin",
        "/usr/lib/postgresql/17/bin",
        "/opt/homebrew/opt/postgresql@17/bin",
    ];
    for (const candidate of [...new Set(candidates)]) {
        const binaries = Object.fromEntries(["initdb", "pg_ctl", "psql", "createdb"].map((name) =>
            [name, path.resolve(candidate, name + executableExtension)]
        ));
        if (!(await Promise.all(Object.values(binaries).map(exists))).every(Boolean)) continue;
        const result = await run(binaries.pg_ctl, ["--version"]);
        if (/\b17(?:\.|\s|$)/.test(result.output)) return binaries;
    }
    throw new Error("PostgreSQL 17 binaries not found. Set POSTGRES_BIN to the directory containing initdb, pg_ctl, psql and createdb.");
}

async function loadConfig() {
    if (!(await exists(configPath))) return null;
    let config;
    try {
        config = JSON.parse(await fs.readFile(configPath, "utf8"));
    } catch {
        // JSON parser errors may quote the credential-containing source text.
        throw new Error("Cannot read the local PostgreSQL configuration. Inspect .local/postgres-config.json privately.");
    }
    return validateLocalConfig(config);
}

async function prepareConfig() {
    const previous = await loadConfig();
    if (previous) return previous;
    if (await exists(dataDirectory) && (await fs.readdir(dataDirectory)).length) {
        throw new Error("An existing cluster has no QuestMart configuration. Refusing to modify it.");
    }
    await fs.mkdir(localDirectory, { recursive: true, mode: 0o700 });
    await assertWorkspacePaths();
    const config = {
        ...LOCAL_DATABASE,
        dataDirectory,
        password: randomBytes(32).toString("base64url"),
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    await secureFile(configPath);
    return config;
}

async function initialized() {
    const versionPath = path.join(dataDirectory, "PG_VERSION");
    if (!(await exists(versionPath))) return false;
    if ((await fs.readFile(versionPath, "utf8")).trim() !== "17") {
        throw new Error("Existing local data is not a PostgreSQL 17 cluster. No files were changed.");
    }
    // A failed initdb may leave PG_VERSION behind. Do not try to start a partial cluster.
    for (const required of ["postgresql.conf", "pg_hba.conf", "global/pg_control"]) {
        if (!(await exists(path.join(dataDirectory, required)))) {
            throw new Error("The local PostgreSQL cluster is incomplete. Inspect .local/postgres; no existing data will be deleted automatically.");
        }
    }
    return true;
}

async function initializeCluster(binaries, config) {
    if (await initialized()) return;
    if (await exists(dataDirectory) && (await fs.readdir(dataDirectory)).length) {
        throw new Error("Partial initialization found in .local/postgres. Inspect it manually; no existing data will be deleted automatically.");
    }
    const passwordFile = path.join(localDirectory, `.initdb-password-${randomUUID()}`);
    try {
        await fs.writeFile(passwordFile, config.password + "\n", { mode: 0o600, flag: "wx" });
        await secureFile(passwordFile);
        await run(binaries.initdb, [
            "-D", dataDirectory,
            "--username", config.user,
            "--pwfile", passwordFile,
            "--auth-host=scram-sha-256",
            "--auth-local=scram-sha-256",
            "--encoding=UTF8",
            "--locale=C",
            "--no-clean",
        ]);
        await fs.appendFile(path.join(dataDirectory, "postgresql.conf"),
            "\n# QuestMart isolated local development cluster\nlisten_addresses = '127.0.0.1'\nport = 55432\npassword_encryption = 'scram-sha-256'\n");
    } finally {
        await fs.unlink(passwordFile).catch((error) => { if (error.code !== "ENOENT") throw error; });
    }
}

async function clusterIsRunning(binaries) {
    const status = await run(binaries.pg_ctl, ["-D", dataDirectory, "status"], { allowedCodes: [0, 3] });
    return status.code === 0;
}

async function assertPortAvailable(config) {
    await new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once("error", (error) => {
            if (error.code === "EADDRINUSE" || error.code === "EACCES") {
                reject(new Error(`Port ${config.port} is occupied or unavailable. Refusing to touch another PostgreSQL service.`));
            } else reject(error);
        });
        probe.listen({ host: config.host, port: config.port, exclusive: true }, () => probe.close(resolve));
    });
}

function connectionOptions(config) {
    return ["--host", config.host, "--port", String(config.port), "--username", config.user, "--no-password"];
}

function connectionEnvironment(config) {
    // Avoid inherited libpq service/host overrides targeting an unrelated database.
    const cleared = Object.fromEntries(Object.keys(process.env)
        .filter((key) => /^PG[A-Z_]+$/i.test(key)).map((key) => [key, undefined]));
    return { ...cleared, PGPASSWORD: config.password, PGCONNECT_TIMEOUT: "5", PGSSLMODE: "disable" };
}

async function query(binaries, config, sql) {
    const response = await run(binaries.psql, [
        ...connectionOptions(config), "--dbname", "postgres", "--no-psqlrc", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--command", sql,
    ], { environment: connectionEnvironment(config) });
    return response.output;
}

async function verifyRunningCluster(binaries, config) {
    const actual = await query(binaries, config, "SHOW data_directory;");
    const expected = await fs.realpath(dataDirectory);
    if (normalizedPath(actual) !== normalizedPath(expected)) {
        throw new Error("The listening PostgreSQL server does not belong to this workspace. Refusing database changes.");
    }
}

async function startCluster(binaries, config) {
    if (!(await clusterIsRunning(binaries))) {
        await assertPortAvailable(config);
        await refuseSymlink(logPath);
        await run(binaries.pg_ctl, [
            "-D", dataDirectory, "-l", logPath, "-o", "-h 127.0.0.1 -p 55432", "-w", "-t", "30", "start",
        ], { finishOnExit: true });
    }
    await verifyRunningCluster(binaries, config);
}

async function ensureDatabase(binaries, config) {
    const present = await query(binaries, config, "SELECT 1 FROM pg_database WHERE datname = 'questmart_demo';");
    if (present !== "1") {
        await run(binaries.createdb, [...connectionOptions(config), "--owner", config.user, config.database], {
            environment: connectionEnvironment(config),
        });
    }
}

async function writeEnvironment(config) {
    await refuseSymlink(envPath);
    const existing = await exists(envPath) ? await fs.readFile(envPath, "utf8") : "";
    const next = updateEnvironmentContents(existing, databaseUrl(config));
    if (next === existing) return;
    const temporary = path.join(projectRoot, `.env.local-${randomUUID()}.tmp`);
    try {
        await fs.writeFile(temporary, next, { mode: 0o600, flag: "wx" });
        await secureFile(temporary);
        await fs.rename(temporary, envPath);
    } finally {
        await fs.unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; });
    }
}

export async function main(command) {
    if (!["setup", "start", "stop", "status"].includes(command)) {
        throw new Error("Usage: node scripts/db-local.mjs setup|start|stop|status");
    }
    await assertWorkspacePaths();
    let config = await loadConfig();
    if (!config && command !== "setup") {
        if (command === "start") throw new Error("Run node scripts/db-local.mjs setup first.");
        console.log("QuestMart local PostgreSQL has not been set up.");
        return;
    }
    const binaries = await discoverBinaries();
    if (command === "setup") {
        config = await prepareConfig();
        await initializeCluster(binaries, config);
    } else if (!(await initialized())) {
        throw new Error("Local PostgreSQL has not finished initialization. Run setup or inspect .local/postgres; existing data is never removed automatically.");
    }
    if (command === "status") {
        const running = await clusterIsRunning(binaries);
        if (running) await verifyRunningCluster(binaries, config);
        console.log(`QuestMart local PostgreSQL is ${running ? "running on 127.0.0.1:55432" : "stopped"}.`);
        return;
    }
    if (command === "stop") {
        if (await clusterIsRunning(binaries)) {
            await run(binaries.pg_ctl, ["-D", dataDirectory, "-w", "-t", "30", "stop", "-m", "fast"]);
        }
        console.log("QuestMart local PostgreSQL is stopped. Its data is preserved.");
        return;
    }
    await startCluster(binaries, config);
    await ensureDatabase(binaries, config);
    await writeEnvironment(config);
    console.log("QuestMart local PostgreSQL is running on 127.0.0.1:55432 (database: questmart_demo).");
    console.log("DATABASE_URL is configured in .env.local. Credentials are stored only in ignored local files.");
}

if (process.argv[1] && normalizedPath(process.argv[1]) === normalizedPath(fileURLToPath(import.meta.url))) {
    main(process.argv[2]).catch((error) => {
        console.error(`Local database setup: ${error.message}`);
        process.exitCode = 1;
    });
}
