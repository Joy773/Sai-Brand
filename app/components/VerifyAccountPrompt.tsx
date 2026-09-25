"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { LuX } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white/60 px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

export default function VerifyAccountPrompt() {
  const { status, data: session } = useSession();
  const {
    prompt,
    title,
    subtitle,
    otpLabel,
    otpPlaceholder,
    submitLabel,
    verifying,
    error,
    success,
    resend,
    resendSending,
    resendSuccess,
    close,
  } = useMessages().verifyAccount;

  const [needsVerification, setNeedsVerification] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  const isUser = status === "authenticated" && session?.user?.role !== "admin";

  useEffect(() => {
    if (!isUser || !email) {
      setNeedsVerification(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/user/profile");
        const data = (await response.json()) as {
          ok?: boolean;
          emailVerified?: boolean;
        };

        if (!cancelled && response.ok && data.ok) {
          setNeedsVerification(data.emailVerified === false);
        }
      } catch {
        if (!cancelled) {
          setNeedsVerification(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [email, isUser]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!needsVerification) {
    return null;
  }

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isVerifying || otp.length !== 4 || !email) {
      return;
    }

    try {
      setIsVerifying(true);

      const response = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        toast.error(data.error ?? error);
        return;
      }

      setNeedsVerification(false);
      setIsOpen(false);
      setOtp("");
      toast.success(success);
    } catch {
      toast.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending) {
      return;
    }

    try {
      setIsResending(true);

      const response = await fetch("/api/auth/resend-email-otp", { method: "POST" });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        toast.error(data.error ?? error);
        return;
      }

      setOtp("");
      toast.success(resendSuccess);
    } catch {
      toast.error(error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <div className="flex justify-center bg-[#F1E5DC] px-4 py-2.5">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-sm font-semibold text-dark-green underline decoration-dark-green/40 underline-offset-4 transition-colors hover:text-gold sm:text-base"
        >
          {prompt}
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-green/50 p-3 sm:p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-account-title"
            className="relative w-full max-w-md rounded-3xl border border-beige bg-warm-white p-6 shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-dark-green/70 transition-colors hover:bg-beige/60 hover:text-dark-green"
              aria-label={close}
            >
              <LuX className="h-5 w-5" aria-hidden />
            </button>

            <div className="pe-8">
              <h2
                id="verify-account-title"
                className="text-2xl font-bold text-dark-green"
              >
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-dark-green/70">
                {subtitle}
              </p>
            </div>

            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                  {otpLabel}
                </span>
                <input
                  type="text"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{4}"
                  maxLength={4}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder={otpPlaceholder}
                  className={inputClassName}
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isVerifying || otp.length !== 4}
                className="w-full rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? verifying : submitLabel}
              </button>

              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={isResending}
                className="w-full text-sm font-semibold text-dark-green underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResending ? resendSending : resend}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
