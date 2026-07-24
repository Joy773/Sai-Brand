export const EMAIL_VERIFICATION_CHANNEL = "sai-email-verification";

export const PENDING_VERIFICATION_EMAIL_KEY =
  "sai:pending-verification-email";

export type VerificationOfferMessage = {
  type: "offer";
  email: string;
  autoLoginToken: string;
};

export type VerificationClaimMessage = {
  type: "claim";
  email: string;
};

export type VerificationHandoffMessage =
  | VerificationOfferMessage
  | VerificationClaimMessage;

export function markPendingVerificationEmail(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    PENDING_VERIFICATION_EMAIL_KEY,
    email.trim().toLowerCase(),
  );
}

export function clearPendingVerificationEmail() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function getPendingVerificationEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
}
