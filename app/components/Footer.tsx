"use client";

import Link from "next/link";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { useCookieConsent } from "@/app/i18n/CookieConsentProvider";
import { handleSectionClick } from "@/app/lib/scrollToSection";

export default function Footer() {
  const {
    brandName,
    description,
    quickLinksTitle,
    quickLinks,
    supportTitle,
    supportLinks,
    contactTitle,
    contactPrompt,
    contactEmail,
    contactAvailability,
    trustLine,
    copyright,
    tagline,
  } = useMessages().footer;
  const { openCookieSettings } = useCookieConsent();

  return (
    <footer className="bg-dark-green text-beige">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-12">
          <div>
            <h3 className="text-xl font-bold text-warm-white">{brandName}</h3>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-beige/80 sm:text-base">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:contents">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-warm-white">
                {quickLinksTitle}
              </h4>
              <ul className="mt-4 flex flex-col gap-3">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(event) => handleSectionClick(event, link.href)}
                      className="text-sm text-beige/80 transition-colors hover:text-beige sm:text-base"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-warm-white">
                {supportTitle}
              </h4>
              <ul className="mt-4 flex flex-col gap-3">
                {supportLinks.map((link) => (
                  <li key={link.href}>
                    {link.href === "#cookie-settings" ? (
                      <button
                        type="button"
                        onClick={openCookieSettings}
                        className="text-start text-sm text-beige/80 transition-colors hover:text-beige sm:text-base"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-beige/80 transition-colors hover:text-beige sm:text-base"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-warm-white">
              {contactTitle}
            </h4>
            <div className="mt-4 flex flex-col gap-3 text-sm text-beige/80 sm:text-base">
              <p>{contactPrompt}</p>
              <a
                href={`mailto:${contactEmail}`}
                className="transition-colors hover:text-beige"
              >
                {contactEmail}
              </a>
              <p>{contactAvailability}</p>
            </div>
          </div>
        </div>

        <p className="mt-12 border-t border-beige/20 pt-8 text-center text-xs text-beige/70 sm:text-sm">
          {trustLine}
        </p>

        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-beige/60 sm:text-sm">
          <p>{copyright}</p>
          <p>{tagline}</p>
        </div>
      </div>
    </footer>
  );
}
