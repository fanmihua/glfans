export const adminLogoutFailureMessage = "退出失败，请重试。";

export async function attemptAdminLogout(logout) {
  try {
    await logout();
    return { signedOut: true, message: "" };
  } catch {
    return { signedOut: false, message: adminLogoutFailureMessage };
  }
}
