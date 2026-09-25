import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;

export function generateEmailOtp() {
  return String(randomInt(1000, 10000));
}

export function emailOtpExpiresAt() {
  return new Date(Date.now() + EMAIL_OTP_TTL_MS);
}

export async function hashEmailOtp(otp: string) {
  return bcrypt.hash(otp, 10);
}

export async function isEmailOtpMatch(
  otp: string,
  hash: string | null | undefined,
  expiresAt: Date | null | undefined,
) {
  if (!hash || !expiresAt) {
    return false;
  }

  if (new Date(expiresAt).getTime() <= Date.now()) {
    return false;
  }

  return bcrypt.compare(otp.trim(), hash);
}
