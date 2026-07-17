import ar from "@/app/messages/ar.json";
import de from "@/app/messages/de.json";
import en from "@/app/messages/en.json";

export const locales = ["en", "de", "ar"] as const;
export type Locale = (typeof locales)[number];

export const LOCALE_CODES = ["EN", "DE", "AR"] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

export const localeToCode: Record<Locale, LocaleCode> = {
  en: "EN",
  de: "DE",
  ar: "AR",
};

export const codeToLocale: Record<LocaleCode, Locale> = {
  EN: "en",
  DE: "de",
  AR: "ar",
};

export const messagesByLocale = { en, de, ar } as const;
export type Messages = (typeof messagesByLocale)[Locale];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export const LOCALE_STORAGE_KEY = "sai-brand-locale";
export const LOCALE_COOKIE_KEY = "sai-brand-locale";
