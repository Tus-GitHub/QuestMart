import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import nextEnv from '@next/env';
import { query, closePool } from '../lib/db.mjs';

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) {
    throw new Error('Auth smoke tests are restricted to a local demo server.');
}
const suffix = randomBytes(6).toString('hex');
const username = `smoke_${suffix}`;
const email = `${username}@example.test`;
const password = randomBytes(20).toString('hex');
let cookie = '';
async function request(path, { body, method = 'GET', origin = new URL(base).origin } = {}) {
    const response = await fetch(base + path, {
        method,
        headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: origin, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
    });
    return { status: response.status, data: await response.json(), setCookie: response.headers.get('set-cookie') };
}

try {
    assert.equal((await request('/api/auth/me')).status, 401);
    assert.equal((await request('/api/auth/signup', { method: 'POST', body: { username, email, password } })).status, 201);
    assert.equal((await request('/api/auth/signup', { method: 'POST', body: { username, email, password } })).status, 409);
    assert.equal((await request('/api/auth/signin', { method: 'POST', body: { identifier: email, password: 'incorrect-password' } })).status, 401);
    const login = await request('/api/auth/signin', { method: 'POST', body: { identifier: email, password } });
    assert.equal(login.status, 200);
    assert.ok(login.setCookie?.includes('HttpOnly'));
    assert.ok(login.setCookie?.includes('SameSite=Lax'));
    cookie = login.setCookie.split(';')[0];
    const session = await request('/api/auth/me');
    assert.equal(session.status, 200);
    assert.equal(session.data.user.username, username);
    assert.ok(!('password' in session.data.user) && !('password_hash' in session.data.user));
    const legitimateCookie = cookie;
    cookie += 'tampered';
    assert.equal((await request('/api/auth/me')).status, 401);
    cookie = legitimateCookie;
    assert.equal((await request('/api/auth/signout', { method: 'POST', origin: 'https://untrusted.example' })).status, 403);
    const logout = await request('/api/auth/signout', { method: 'POST' });
    assert.equal(logout.status, 200);
    assert.ok(logout.setCookie?.includes('Max-Age=0'));
    cookie = '';
    assert.equal((await request('/api/auth/me')).status, 401);
    console.log('Auth HTTP smoke checks passed: signup, duplicate, bad password, signin, session, tampering, origin rejection, logout.');
} finally {
    // Remove only this run's generated account, even after a failed assertion.
    await query('DELETE FROM users WHERE username = $1 AND email = $2', [username, email]);
    await closePool();
}
