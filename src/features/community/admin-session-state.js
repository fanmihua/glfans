export const adminLogoutFailureMessage = "退出失败，请重试。";
export const adminInvalidCredentialsMessage = "邮箱或密码不对，或者账号还没有启用。";
export const adminLoginRateLimitMessage = "登录尝试过多，请十五分钟后再试。";
export const adminLoginUnavailableMessage = "登录服务暂时没有回应，请稍后再试。";

const alreadySignedOutCodes = new Set(["session_required", "admin_forbidden"]);

export function adminLoginErrorMessage(error) {
  if (error?.code === "login_rate_limit") return adminLoginRateLimitMessage;
  if (error?.code === "invalid_credentials" || error?.code === "email_invalid") {
    return adminInvalidCredentialsMessage;
  }
  return adminLoginUnavailableMessage;
}

export async function attemptAdminLogout(logout) {
  try {
    await logout();
    return { signedOut: true, message: "" };
  } catch (error) {
    if (alreadySignedOutCodes.has(error?.code)) {
      return { signedOut: true, message: "" };
    }
    return { signedOut: false, message: adminLogoutFailureMessage };
  }
}
