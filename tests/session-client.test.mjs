import test from "node:test";
import assert from "node:assert/strict";
import { makeStore } from "../redux/store.js";
import {
    checkSession,
    signInStart,
    signInSuccess,
    signOutUserStart,
    signOutUserSuccess,
    signOutUserFailure,
} from "../redux/user/userSlice.js";

const user = { _id: "507f1f77bcf86cd799439011", username: "seller", email: "seller@example.com" };

function deferredResponse(t) {
    let resolve;
    t.mock.method(globalThis, "fetch", () => new Promise((done) => { resolve = done; }));
    return (body, status = 200) => resolve(new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    }));
}

test("a fresh app never restores a browser-persisted identity", () => {
    const store = makeStore();
    assert.equal(store.getState().user.currentUser, null);
    assert.equal(store.getState().user.sessionChecked, false);
    const otherStore = makeStore();
    store.dispatch(signInSuccess(user));
    assert.equal(otherStore.getState().user.currentUser, null);
});

test("valid session responses restore the server's user", async (t) => {
    const respond = deferredResponse(t);
    const store = makeStore();
    const request = store.dispatch(checkSession());
    assert.equal(store.getState().user.sessionChecking, true);
    respond({ success: true, user });
    await request;
    assert.deepEqual(store.getState().user.currentUser, user);
    assert.equal(store.getState().user.sessionChecked, true);
});

test("expired sessions become anonymous without a retry error", async (t) => {
    const respond = deferredResponse(t);
    const store = makeStore();
    store.dispatch(signInSuccess(user));
    const request = store.dispatch(checkSession());
    respond({ success: false }, 401);
    await request;
    assert.equal(store.getState().user.currentUser, null);
    assert.equal(store.getState().user.sessionChecked, true);
    assert.equal(store.getState().user.sessionError, null);
});

test("server outages remain retryable instead of pretending the user signed out", async (t) => {
    const respond = deferredResponse(t);
    const store = makeStore();
    const request = store.dispatch(checkSession());
    respond({ success: false }, 503);
    await request;
    assert.equal(store.getState().user.sessionChecked, false);
    assert.equal(store.getState().user.sessionChecking, false);
    assert.match(store.getState().user.sessionError, /try again/i);
});

test("a delayed anonymous session response cannot erase a new login", async (t) => {
    const respond = deferredResponse(t);
    const store = makeStore();
    const request = store.dispatch(checkSession());
    store.dispatch(signInStart());
    store.dispatch(signInSuccess(user));
    respond({ success: false }, 401);
    await request;
    assert.deepEqual(store.getState().user.currentUser, user);
    assert.equal(store.getState().user.sessionChecked, true);
});

test("a delayed authenticated session response cannot undo logout", async (t) => {
    const respond = deferredResponse(t);
    const store = makeStore();
    const request = store.dispatch(checkSession());
    store.dispatch(signOutUserStart());
    store.dispatch(signOutUserSuccess());
    respond({ success: true, user });
    await request;
    assert.equal(store.getState().user.currentUser, null);
    assert.equal(store.getState().user.sessionChecked, true);
});

test("failed logout preserves the account and displays the failure", () => {
    const store = makeStore();
    store.dispatch(signInSuccess(user));
    store.dispatch(signOutUserStart());
    store.dispatch(signOutUserFailure("Service unavailable"));
    assert.deepEqual(store.getState().user.currentUser, user);
    assert.equal(store.getState().user.loading, false);
    assert.equal(store.getState().user.error, "Service unavailable");
});
