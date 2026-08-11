// End-to-end tests for the account settings endpoints.
//
// Runs against a THROWAWAY database (same cluster, different db name) and
// mounts only the auth router, so it never touches real accounts, never
// starts the fixture cron, and never calls API-Football. The test database is
// dropped at the end.
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const PORT = 5099;
const BASE = `http://localhost:${PORT}/api/auth`;

// Swap the database name in the connection string for a throwaway one
function testUri() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");
  const [head, query] = uri.split("?");
  const withoutDb = head.replace(/\/[^/]*$/, "");
  return `${withoutDb}/pl-predictions-accounttest${query ? "?" + query : ""}`;
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}` +
    (ok ? "" : `\n          got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`));
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, body: json };
}

(async () => {
  const uri = testUri();
  await mongoose.connect(uri);
  console.log("connected to throwaway db:", mongoose.connection.name, "\n");
  await mongoose.connection.dropDatabase(); // start clean

  const app = express();
  app.use(express.json());
  app.use("/api/auth", require("../middleware/auth"));
  const server = app.listen(PORT);

  const OLD_PW = "originalPass123";
  const NEW_PW = "brandNewPass456";

  // ── Set up two accounts so we can test clashes ──────────────
  const me = await call("POST", "/register", {
    body: { username: "tester", email: "tester@example.com", password: OLD_PW },
  });
  const other = await call("POST", "/register", {
    body: { username: "rival", email: "rival@example.com", password: "someOtherPass1" },
  });
  check("two accounts registered", [me.status, other.status], [200, 200]);
  let token = me.body.token;

  // ── Profile updates ────────────────────────────────────────
  console.log("\n--- Updating your details ---");

  let r = await call("PATCH", "/profile", { body: { username: "x", email: "x@y.com", currentPassword: OLD_PW } });
  check("rejected without a token", r.status, 401);

  r = await call("PATCH", "/profile", {
    token, body: { username: "newname", email: "tester@example.com", currentPassword: "wrongPassword" },
  });
  check("wrong password is rejected", [r.status, r.body.message], [401, "That password isn't right"]);
  // A wrong password must NOT look like an expired session, or the frontend
  // signs the user out mid-form.
  check("wrong password is not flagged as a dead session", r.body.code, undefined);

  r = await call("PATCH", "/profile", { token: "not-a-real-token", body: { username: "x", email: "x@y.com", currentPassword: OLD_PW } });
  check("a bad token IS flagged as a dead session", [r.status, r.body.code], [401, "token_invalid"]);

  r = await call("PATCH", "/profile", {
    token, body: { username: "rival", email: "tester@example.com", currentPassword: OLD_PW },
  });
  check("username already taken", [r.status, r.body.message], [400, "That username is already taken"]);

  r = await call("PATCH", "/profile", {
    token, body: { username: "tester", email: "rival@example.com", currentPassword: OLD_PW },
  });
  check("email already in use", [r.status, r.body.message], [400, "That email is already in use"]);

  r = await call("PATCH", "/profile", {
    token, body: { username: "no spaces!", email: "tester@example.com", currentPassword: OLD_PW },
  });
  check("invalid characters rejected", r.status, 400);

  r = await call("PATCH", "/profile", {
    token, body: { username: "ab", email: "tester@example.com", currentPassword: OLD_PW },
  });
  check("too-short name rejected", r.status, 400);

  r = await call("PATCH", "/profile", {
    token, body: { username: "sneath_new", email: "newmail@example.com", currentPassword: OLD_PW },
  });
  check("name and email saved", [r.status, r.body.user.username, r.body.user.email],
    [200, "sneath_new", "newmail@example.com"]);

  r = await call("GET", "/me", { token });
  check("change is reflected in /me", [r.body.username, r.body.email], ["sneath_new", "newmail@example.com"]);

  // ── Password change ────────────────────────────────────────
  console.log("\n--- Changing your password ---");

  r = await call("POST", "/change-password", { body: { currentPassword: OLD_PW, newPassword: NEW_PW } });
  check("rejected without a token", r.status, 401);

  r = await call("POST", "/change-password", {
    token, body: { currentPassword: "nope", newPassword: NEW_PW },
  });
  check("wrong current password rejected", [r.status, r.body.message], [401, "That password isn't right"]);
  check("wrong password is not flagged as a dead session", r.body.code, undefined);

  r = await call("POST", "/change-password", {
    token, body: { currentPassword: OLD_PW, newPassword: "short" },
  });
  check("short new password rejected", r.status, 400);

  r = await call("POST", "/change-password", {
    token, body: { currentPassword: OLD_PW, newPassword: OLD_PW },
  });
  check("reusing the same password rejected", r.status, 400);

  r = await call("POST", "/change-password", {
    token, body: { currentPassword: OLD_PW, newPassword: NEW_PW },
  });
  check("password changed", [r.status, typeof r.body.token], [200, "string"]);
  const freshToken = r.body.token;

  r = await call("GET", "/me", { token: freshToken });
  check("the new token works", r.status, 200);

  r = await call("POST", "/login", { body: { username: "sneath_new", password: NEW_PW } });
  check("can log in with the new password", r.status, 200);

  r = await call("POST", "/login", { body: { username: "sneath_new", password: OLD_PW } });
  check("old password no longer works", r.status, 401);

  // ── Clean up ───────────────────────────────────────────────
  await mongoose.connection.dropDatabase();
  console.log("\nthrowaway database dropped");
  server.close();
  await mongoose.disconnect();

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } catch {}
  process.exit(1);
});
