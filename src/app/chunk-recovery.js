import { isWechatBrowser } from './wechat-share.js';

const RECOVERY_STORAGE_KEY = "glfans:chunk-recovery-at";
const RECOVERY_QUERY_KEY = "glfans-reload";
const RECOVERY_COOLDOWN_MS = 60_000;

function readTimestamp(windowObject) {
  let stored = 0;
  try {
    const value = Number(windowObject.sessionStorage.getItem(RECOVERY_STORAGE_KEY));
    if (Number.isFinite(value) && value > 0) stored = value;
  } catch {
    // Some private-browsing modes deny access to sessionStorage.
  }

  const query = Number(new URL(windowObject.location.href).searchParams.get(RECOVERY_QUERY_KEY));
  return Math.max(stored, Number.isFinite(query) && query > 0 ? query : 0);
}

function rememberTimestamp(windowObject, timestamp) {
  try {
    windowObject.sessionStorage.setItem(RECOVERY_STORAGE_KEY, String(timestamp));
  } catch {
    // The query parameter below remains as the loop guard when storage is unavailable.
  }
}

export function installChunkRecovery(windowObject = window, now = () => Date.now()) {
  const handlePreloadError = (event) => {
    const timestamp = now();
    const lastAttempt = readTimestamp(windowObject);

    if (lastAttempt > 0 && timestamp - lastAttempt < RECOVERY_COOLDOWN_MS) return;

    event.preventDefault();
    rememberTimestamp(windowObject, timestamp);

    const recoveryUrl = new URL(windowObject.location.href);
    recoveryUrl.searchParams.set(RECOVERY_QUERY_KEY, String(timestamp));
    windowObject.location.replace(recoveryUrl.href);
  };

  windowObject.addEventListener("vite:preloadError", handlePreloadError);
  return () => windowObject.removeEventListener("vite:preloadError", handlePreloadError);
}

export function removeChunkRecoveryQuery(windowObject = window) {
  // Keep the signed entry query stable for this WeChat document. Its timestamp
  // remains a bounded loop guard; a later genuine failure can still reload.
  if (isWechatBrowser(windowObject.navigator?.userAgent)) return;
  const url = new URL(windowObject.location.href);
  if (!url.searchParams.has(RECOVERY_QUERY_KEY)) return;
  url.searchParams.delete(RECOVERY_QUERY_KEY);
  windowObject.history.replaceState(windowObject.history.state, "", url.href);
}

export function reloadCurrentPage(windowObject = window) {
  const recoveryUrl = new URL(windowObject.location.href);
  recoveryUrl.searchParams.set(RECOVERY_QUERY_KEY, String(Date.now()));
  windowObject.location.replace(recoveryUrl.href);
}

export const chunkRecoveryConfig = Object.freeze({
  queryKey: RECOVERY_QUERY_KEY,
  storageKey: RECOVERY_STORAGE_KEY,
  cooldownMs: RECOVERY_COOLDOWN_MS,
});
