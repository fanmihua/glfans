import assert from "node:assert/strict";
import test from "node:test";
import {
  digestOpaqueToken,
  hashPassword,
  parseCookies,
  serializeSessionCookie,
  verifyPassword,
} from "../security.js";

test("password hashes are salted and verifiable", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword("anything", "malformed"), false);
});
test("opaque digests are keyed and cookies keep secure defaults", () => {
  assert.notEqual(digestOpaqueToken("a".repeat(32), "token"), digestOpaqueToken("b".repeat(32), "token"));
  const cookie = serializeSessionCookie("glfans_session", "a token", { maxAgeSeconds: 60, secure: true });
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.equal(parseCookies("one=1; glfans_session=a%20token").glfans_session, "a token");
});
