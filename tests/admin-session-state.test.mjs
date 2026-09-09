import assert from "node:assert/strict";
import test from "node:test";
import {
  adminInvalidCredentialsMessage,
  adminLoginErrorMessage,
  adminLoginRateLimitMessage,
  adminLoginUnavailableMessage,
  adminLogoutFailureMessage,
  attemptAdminLogout,
} from "../src/features/community/admin-session-state.js";

test("admin logout changes the UI to signed out only after the server confirms it", async () => {
  const result = await attemptAdminLogout(async () => {});
  assert.deepEqual(result, { signedOut: true, message: "" });
});

test("admin logout failure keeps the dashboard active and asks for a retry", async () => {
  for (const error of [
    new TypeError("network unavailable"),
    Object.assign(new Error("service unavailable"), { code: "internal_error", status: 503 }),
  ]) {
    const result = await attemptAdminLogout(async () => { throw error; });
    assert.deepEqual(result, {
      signedOut: false,
      message: adminLogoutFailureMessage,
    });
  }
});

test("an already missing or forbidden admin session is treated as signed out", async () => {
  for (const code of ["session_required", "admin_forbidden"]) {
    const result = await attemptAdminLogout(async () => {
      throw Object.assign(new Error(code), { code });
    });
    assert.deepEqual(result, { signedOut: true, message: "" });
  }
});

test("admin login errors use three non-enumerating user-facing categories", () => {
  assert.equal(
    adminLoginErrorMessage({ code: "invalid_credentials", status: 401 }),
    adminInvalidCredentialsMessage,
  );
  assert.equal(
    adminLoginErrorMessage({ code: "email_invalid", status: 400 }),
    adminInvalidCredentialsMessage,
  );
  assert.equal(
    adminLoginErrorMessage({ code: "login_rate_limit", status: 429 }),
    adminLoginRateLimitMessage,
  );
  assert.equal(adminLoginErrorMessage(new TypeError("fetch failed")), adminLoginUnavailableMessage);
  assert.equal(adminLoginErrorMessage({ code: "internal_error", status: 503 }), adminLoginUnavailableMessage);
});
