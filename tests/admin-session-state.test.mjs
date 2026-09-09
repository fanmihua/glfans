import assert from "node:assert/strict";
import test from "node:test";
import {
  adminLogoutFailureMessage,
  attemptAdminLogout,
} from "../src/features/community/admin-session-state.js";

test("admin logout changes the UI to signed out only after the server confirms it", async () => {
  const result = await attemptAdminLogout(async () => {});
  assert.deepEqual(result, { signedOut: true, message: "" });
});

test("admin logout failure keeps the dashboard active and asks for a retry", async () => {
  const result = await attemptAdminLogout(async () => {
    throw new Error("network unavailable");
  });
  assert.deepEqual(result, {
    signedOut: false,
    message: adminLogoutFailureMessage,
  });
});
