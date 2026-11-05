import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
const failures = [];
const uri = process.env.DATABASE_URL;
if (!uri || !/^postgres(?:ql)?:\/\//.test(uri)) {
  failures.push('DATABASE_URL must be a PostgreSQL connection string.');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  failures.push('JWT_SECRET must contain at least 32 characters.');
}
if (process.env.NEXT_PUBLIC_DATABASE_URL || process.env.MONGODB_URI) {
  failures.push('Remove legacy MongoDB variables; use server-only DATABASE_URL.');
}
for (const failure of failures) console.error(failure);
if (failures.length) process.exitCode = 1;
else console.log('Required server environment settings are configured. Values are never printed.');
if (!process.env.NEXT_PUBLIC_ROWG_KEY) {
  console.log('Optional RAWG key is missing; the reference catalog will show a configuration error.');
}
