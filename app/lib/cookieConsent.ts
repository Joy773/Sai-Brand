export const COOKIE_CONSENT_STORAGE_KEY = "sai-cookie-consent";
export const COOKIE_MODAL_DELAY_MS = 5000;

export type CookiePreferences = {
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsentRecord = {
  preferences: CookiePreferences;
  consented: boolean;
  updatedAt: string;
};

export const defaultCookiePreferences = (): CookiePreferences => ({
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
});

export const allAcceptedPreferences = (): CookiePreferences => ({
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
});

export function loadCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (!parsed?.preferences) {
      return null;
    }

    return {
      ...parsed,
      preferences: {
        essential: true,
        functional: Boolean(parsed.preferences.functional),
        analytics: Boolean(parsed.preferences.analytics),
        marketing: Boolean(parsed.preferences.marketing),
      },
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(
  preferences: CookiePreferences,
  consented = true,
): CookieConsentRecord {
  const record: CookieConsentRecord = {
    preferences: {
      essential: true,
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    },
    consented,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}
