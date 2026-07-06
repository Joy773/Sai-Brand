"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import CookieModal from "@/app/components/CookieModal";
import {
  defaultCookiePreferences,
  COOKIE_MODAL_DELAY_MS,
  loadCookieConsent,
  saveCookieConsent,
  type CookiePreferences,
} from "@/app/lib/cookieConsent";

type CookieConsentContextValue = {
  openCookieSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState(defaultCookiePreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadCookieConsent();
    if (saved) {
      setPreferences(saved.preferences);
    }
    setReady(true);

    if (saved?.consented) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, COOKIE_MODAL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const persistPreferences = useCallback((next: CookiePreferences) => {
    const record = saveCookieConsent(next, true);
    setPreferences(record.preferences);
    setIsOpen(false);
  }, []);

  const openCookieSettings = useCallback(() => {
    const saved = loadCookieConsent();
    if (saved) {
      setPreferences(saved.preferences);
    }
    setIsOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      openCookieSettings,
    }),
    [openCookieSettings],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {ready ? (
        <CookieModal
          isOpen={isOpen}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onRejectAll={() => persistPreferences(defaultCookiePreferences())}
          onAcceptAll={() =>
            persistPreferences({
              essential: true,
              functional: true,
              analytics: true,
              marketing: true,
            })
          }
          onSavePreferences={() => persistPreferences(preferences)}
        />
      ) : null}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return context;
}
