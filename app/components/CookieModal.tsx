"use client";

import { useEffect, useRef } from "react";
import { LuLock } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";
import type { CookiePreferences } from "@/app/lib/cookieConsent";

type CookieCategory = "essential" | "functional" | "analytics" | "marketing";

type CookieModalProps = {
  isOpen: boolean;
  preferences: CookiePreferences;
  onPreferencesChange: (preferences: CookiePreferences) => void;
  onRejectAll: () => void;
  onAcceptAll: () => void;
  onSavePreferences: () => void;
};

function CookieToggle({
  enabled,
  locked = false,
  onLabel,
  offLabel,
  onToggle,
}: {
  enabled: boolean;
  locked?: boolean;
  onLabel: string;
  offLabel: string;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={locked}
      onClick={onToggle}
      className={`inline-flex min-w-[4.5rem] items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors ${
        enabled
          ? "bg-dark-green text-warm-white"
          : "bg-beige text-dark-green/70"
      } ${locked ? "cursor-not-allowed opacity-90" : "hover:opacity-90"}`}
    >
      {locked ? <LuLock className="h-3.5 w-3.5" aria-hidden /> : null}
      {enabled ? onLabel : offLabel}
    </button>
  );
}

export default function CookieModal({
  isOpen,
  preferences,
  onPreferencesChange,
  onRejectAll,
  onAcceptAll,
  onSavePreferences,
}: CookieModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { title, description, categories, on, off, rejectAll, acceptAll, savePreferences } =
    useMessages().cookieModal;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const categoryOrder: CookieCategory[] = [
    "essential",
    "functional",
    "analytics",
    "marketing",
  ];

  const toggleCategory = (category: CookieCategory) => {
    if (category === "essential") {
      return;
    }

    onPreferencesChange({
      ...preferences,
      [category]: !preferences[category],
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-green/50 p-3 sm:p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-modal-title"
        className="relative max-h-[90vh] w-[95%] max-w-[650px] overflow-y-auto rounded-3xl border border-beige bg-warm-white p-6 shadow-2xl sm:p-8"
      >
        <div>
          <h2
            id="cookie-modal-title"
            className="text-2xl font-bold text-dark-green sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-green/70 sm:text-base">
            {description}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {categoryOrder.map((category) => {
            const item = categories[category];
            const enabled = preferences[category];

            return (
              <div
                key={category}
                className="rounded-2xl border border-beige bg-beige/30 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-dark-green">{item.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-dark-green/70">
                      {item.description}
                    </p>
                  </div>
                  <CookieToggle
                    enabled={enabled}
                    locked={category === "essential"}
                    onLabel={on}
                    offLabel={off}
                    onToggle={() => toggleCategory(category)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded-full border border-dark-green/20 px-5 py-2.5 text-sm font-medium text-dark-green transition-colors hover:border-dark-green/40 hover:bg-beige/50"
          >
            {rejectAll}
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-full border border-dark-green/20 px-5 py-2.5 text-sm font-medium text-dark-green transition-colors hover:border-dark-green/40 hover:bg-beige/50"
          >
            {acceptAll}
          </button>
          <button
            type="button"
            onClick={onSavePreferences}
            className="rounded-full bg-dark-green px-5 py-2.5 text-sm font-medium text-warm-white transition-colors hover:bg-dark-green/90"
          >
            {savePreferences}
          </button>
        </div>
      </div>
    </div>
  );
}
