import { randomBytes } from "crypto";

type AdminOtpEntry = {
  otp: string;
  expiresAt: number;
};

type AdminResetTokenEntry = {
  token: string;
  expiresAt: number;
};

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

// Single-instance in-memory store (sufficient on one droplet).
let currentOtp: AdminOtpEntry | null = null;
let currentResetToken: AdminResetTokenEntry | null = null;

export function generateAdminOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function storeAdminOtp(otp: string) {
  currentOtp = {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  };
  currentResetToken = null;
}

export function peekAdminOtp() {
  if (!currentOtp) {
    return null;
  }

  if (currentOtp.expiresAt <= Date.now()) {
    currentOtp = null;
    return null;
  }

  return currentOtp;
}

export function verifyAdminOtp(otp: string) {
  const entry = peekAdminOtp();
  if (!entry || entry.otp !== otp.trim()) {
    return null;
  }

  // OTP is single-use once verified.
  currentOtp = null;

  const token = randomBytes(24).toString("hex");
  currentResetToken = {
    token,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  };

  return token;
}

export function consumeAdminResetToken(token: string) {
  if (!currentResetToken) {
    return false;
  }

  if (currentResetToken.expiresAt <= Date.now()) {
    currentResetToken = null;
    return false;
  }

  if (currentResetToken.token !== token.trim()) {
    return false;
  }

  currentResetToken = null;
  return true;
}
