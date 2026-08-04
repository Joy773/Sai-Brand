"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LuChevronDown, LuShoppingCart } from "react-icons/lu";
import { toast } from "sonner";
import { codeToLocale } from "@/app/i18n/locales";
import {
  useLocale,
  useLocaleCode,
  useMessages,
} from "@/app/i18n/LocaleProvider";
import type { LocaleCode } from "@/app/i18n/locales";
import { handleSectionClick } from "@/app/lib/scrollToSection";
import SignupModal from "@/app/components/SignupModal";
import SignInModal from "@/app/components/SignInModal";
import ForgotPasswordModal from "@/app/components/ForgotPasswordModal";
import { selectCartItemCount, useCartStore } from "@/app/store/cart-store";

function formatGreeting(template: string, name: string) {
  return template.replace("{name}", name);
}

function UserAuthMenu({
  firstName,
  greeting,
  orders,
  profileSettings,
  logout,
  onLogout,
  variant,
}: {
  firstName: string;
  greeting: string;
  orders: string;
  profileSettings: string;
  logout: string;
  onLogout: () => Promise<void>;
  variant: "desktop" | "mobile";
}) {
  const greetingLabel = formatGreeting(greeting, firstName);
  const greetingClassName =
    "text-base font-medium text-dark-green transition-colors hover:text-dark-green/70";
  const menuItemClassName =
    "text-sm font-medium text-dark-green transition-colors hover:text-dark-green/70";

  if (variant === "mobile") {
    return (
      <div className="flex flex-col items-start gap-2">
        <span className={greetingClassName}>{greetingLabel}</span>
        <Link href="/Orders" className={`${menuItemClassName} text-left`}>
          {orders}
        </Link>
        <Link
          href="/profile-settings"
          className={`${menuItemClassName} text-left`}
        >
          {profileSettings}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className={`${menuItemClassName} text-left`}
        >
          {logout}
        </button>
      </div>
    );
  }

  return (
    <div className="group relative hidden md:block">
      <button
        type="button"
        className={`${greetingClassName} inline-flex items-center gap-1`}
        aria-haspopup="menu"
        aria-label={greetingLabel}
      >
        {greetingLabel}
        <LuChevronDown
          className="h-4 w-4 transition-transform group-hover:rotate-180"
          aria-hidden
        />
      </button>
      <div
        role="menu"
        className="pointer-events-none invisible absolute right-0 top-full z-50 min-w-full pt-1 opacity-0 transition-all group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"
      >
        <div className="flex flex-col items-stretch gap-1 bg-[#F3E8DF] py-1">
          <Link
            href="/Orders"
            role="menuitem"
            className={`${menuItemClassName} whitespace-nowrap`}
          >
            {orders}
          </Link>
          <Link
            href="/profile-settings"
            role="menuitem"
            className={`${menuItemClassName} whitespace-nowrap`}
          >
            {profileSettings}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className={`${menuItemClassName} whitespace-nowrap text-left`}
          >
            {logout}
          </button>
        </div>
      </div>
    </div>
  );
}

function LanguageSwitcher({
  className = "",
  onSelect,
}: {
  className?: string;
  onSelect?: () => void;
}) {
  const { setLocale } = useLocale();
  const activeCode = useLocaleCode();
  const { languages } = useMessages().navbar;

  const handleSelect = (code: LocaleCode) => {
    setLocale(codeToLocale[code]);
    onSelect?.();
  };

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${className}`}>
      {languages.map((lang, index) => (
        <span key={lang} className="flex items-center gap-2">
          {index > 0 && (
            <span className="text-dark-green/30" aria-hidden="true">
              /
            </span>
          )}
          <button
            type="button"
            onClick={() => handleSelect(lang as LocaleCode)}
            className={`transition-colors hover:text-dark-green ${
              lang === activeCode ? "text-dark-green" : "text-dark-green/60"
            }`}
            aria-current={lang === activeCode ? "true" : undefined}
          >
            {lang}
          </button>
        </span>
      ))}
    </div>
  );
}

function NavbarContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const {
    navLinks,
    menu,
    cart: cartLabel,
    signIn,
    greeting,
    orders,
    profileSettings,
    logout,
    logoutSuccess,
  } = useMessages().navbar;
  const { data: session, status } = useSession();
  const [firstName, setFirstName] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const itemCount = useCartStore(selectCartItemCount);
  const isAuthenticated = status === "authenticated";
  const callbackUrl = searchParams.get("callbackUrl");
  const shouldOpenSignIn = searchParams.get("signin") === "true";
  const sessionFirstName = (() => {
    const sessionName = session?.user?.name?.trim() ?? "";
    const [fallbackFirstName] = sessionName.split(/\s+/);
    return fallbackFirstName || sessionName;
  })();
  const displayFirstName = firstName || sessionFirstName;

  const authButtonClassName =
    "rounded-full bg-dark-green px-4 py-2 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90";

  const closeMenu = () => setMenuOpen(false);
  const openSignup = () => {
    closeMenu();
    setSignInOpen(false);
    setForgotPasswordOpen(false);
    setSignupOpen(true);
  };
  const openSignIn = () => {
    closeMenu();
    setSignupOpen(false);
    setForgotPasswordOpen(false);
    setSignInOpen(true);
  };
  const openForgotPassword = () => {
    closeMenu();
    setSignupOpen(false);
    setSignInOpen(false);
    setForgotPasswordOpen(true);
  };
  const handleLogout = async () => {
    closeMenu();
    await signOut({ redirect: false });
    toast.success(logoutSuccess);
  };

  useEffect(() => {
    if ((callbackUrl || shouldOpenSignIn) && status === "unauthenticated") {
      setSignInOpen(true);
    }
  }, [callbackUrl, shouldOpenSignIn, status]);

  useEffect(() => {
    if (status === "authenticated") {
      setSignInOpen(false);
      setSignupOpen(false);
      setForgotPasswordOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") {
      setFirstName("");
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        const data = (await response.json()) as {
          ok?: boolean;
          firstName?: string;
        };

        if (cancelled) {
          return;
        }

        if (response.ok && data.ok && data.firstName) {
          setFirstName(data.firstName);
          return;
        }
      } catch {
        // Fall back to session name below.
      }

      if (!cancelled) {
        const sessionName = session?.user?.name?.trim() ?? "";
        const [fallbackFirstName] = sessionName.split(/\s+/);
        setFirstName(fallbackFirstName || sessionName);
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.name]);

  const handleSignInClose = () => {
    setSignInOpen(false);

    if (callbackUrl || shouldOpenSignIn) {
      router.replace("/");
    }
  };

  const handleSignInSuccess = () => {
    setSignInOpen(false);

    if (callbackUrl?.startsWith("/")) {
      router.replace(callbackUrl);
      return;
    }

    router.replace("/");
  };

  return (
    <header className="bg-[#F3E8DF]">
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <a
          href="/#hero"
          onClick={(event) => handleSectionClick(event, "#hero")}
          className="shrink-0"
        >
          <Image
            src="/German_Care_Logo_Print-page.png"
            alt="German Care"
            width={900}
            height={165}
            className="h-10 w-auto object-contain sm:h-11"
            unoptimized
            priority
          />
        </a>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 lg:gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={`/${link.href}`}
                onClick={(event) => handleSectionClick(event, link.href)}
                className="font-medium text-dark-green transition-colors hover:text-dark-green/70"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher className="hidden md:flex md:mr-4 lg:mr-6" />

          {isAuthenticated ? (
            <UserAuthMenu
              firstName={displayFirstName}
              greeting={greeting}
              orders={orders}
              profileSettings={profileSettings}
              logout={logout}
              onLogout={handleLogout}
              variant="desktop"
            />
          ) : (
            <button
              type="button"
              onClick={openSignIn}
              className={`hidden md:inline-flex ${authButtonClassName}`}
            >
              {signIn}
            </button>
          )}

          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-dark-green transition-colors hover:text-dark-green/70"
            aria-label={cartLabel}
          >
            <LuShoppingCart className="h-5 w-5" aria-hidden />
            {itemCount > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-dark-green px-1 text-[10px] font-semibold text-warm-white">
                {itemCount}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md text-dark-green transition-colors hover:text-dark-green/70 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? menu.close : menu.open}
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute left-0 block h-0.5 w-5 bg-current transition-all duration-200 ${
                  menuOpen ? "top-2 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-2 block h-0.5 w-5 bg-current transition-all duration-200 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-5 bg-current transition-all duration-200 ${
                  menuOpen ? "top-2 -rotate-45" : "top-4"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`overflow-hidden border-t border-dark-green/10 transition-all duration-200 md:hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={`/${link.href}`}
                  onClick={(event) =>
                    handleSectionClick(event, link.href, closeMenu)
                  }
                  className="block text-sm font-medium text-dark-green transition-colors hover:text-dark-green/70"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              {isAuthenticated ? (
                <UserAuthMenu
                  firstName={displayFirstName}
                  greeting={greeting}
                  orders={orders}
                  profileSettings={profileSettings}
                  logout={logout}
                  onLogout={handleLogout}
                  variant="mobile"
                />
              ) : (
                <button
                  type="button"
                  onClick={openSignIn}
                  className={`inline-flex ${authButtonClassName}`}
                >
                  {signIn}
                </button>
              )}
            </li>
          </ul>

          <div className="mt-6 border-t border-dark-green/10 pt-4">
            <LanguageSwitcher onSelect={closeMenu} />
          </div>
        </div>
      </div>

      <SignupModal
        isOpen={signupOpen}
        onClose={() => setSignupOpen(false)}
        onOpenSignIn={openSignIn}
      />
      <SignInModal
        isOpen={signInOpen}
        onClose={handleSignInClose}
        onOpenSignup={openSignup}
        onOpenForgotPassword={openForgotPassword}
        onSuccess={handleSignInSuccess}
      />
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        onOpenSignIn={openSignIn}
      />
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense
      fallback={<header className="h-16 bg-[#F3E8DF]" aria-hidden="true" />}
    >
      <NavbarContent />
    </Suspense>
  );
}
