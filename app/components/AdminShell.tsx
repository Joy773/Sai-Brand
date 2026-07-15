"use client";

import { useEffect, useState } from "react";
import { LuMenu } from "react-icons/lu";
import Sidebar from "@/app/components/Sidebar";
import { useMessages } from "@/app/i18n/LocaleProvider";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brandLabel, openMenu, closeMenu } = useMessages().adminSidebar;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const closeOnDesktop = () => {
      if (mediaQuery.matches) {
        setIsMobileNavOpen(false);
      }
    };

    mediaQuery.addEventListener("change", closeOnDesktop);
    return () => mediaQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  const closeMobileNav = () => setIsMobileNavOpen(false);

  return (
    <div className="flex min-h-screen bg-warm-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {isMobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-dark-green/40 lg:hidden"
          aria-label={closeMenu}
          onClick={closeMobileNav}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 start-0 z-50 w-[min(18rem,88vw)] transition-transform duration-200 ease-out lg:hidden ${
          isMobileNavOpen
            ? "translate-x-0"
            : "pointer-events-none -translate-x-full rtl:translate-x-full"
        }`}
      >
        <Sidebar onNavigate={closeMobileNav} onClose={closeMobileNav} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-beige bg-warm-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-beige text-dark-green transition-colors hover:bg-beige/50"
            aria-label={openMenu}
            aria-expanded={isMobileNavOpen}
          >
            <LuMenu className="h-5 w-5" aria-hidden />
          </button>
          <p className="truncate text-sm font-semibold uppercase tracking-[0.16em] text-dark-green/70">
            {brandLabel}
          </p>
        </header>

        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:overflow-y-auto lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
