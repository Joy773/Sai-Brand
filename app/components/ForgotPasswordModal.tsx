"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn?: () => void;
};

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white/60 px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onOpenSignIn,
}: ForgotPasswordModalProps) {
  const {
    title,
    subtitleBefore,
    signInLink,
    emailLabel,
    emailPlaceholder,
    submitLabel,
    close,
    successMessage,
    errorMessage,
  } = useMessages().forgotPasswordModal;

  const dialogRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        toast.error(data.error ?? errorMessage);
        return;
      }

      toast.success(successMessage);
      onClose();
      onOpenSignIn?.();
    } catch {
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-green/50 p-3 sm:p-4"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-modal-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-beige bg-warm-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-dark-green/70 transition-colors hover:bg-beige/60 hover:text-dark-green"
          aria-label={close}
        >
          <LuX className="h-5 w-5" aria-hidden />
        </button>

        <div className="pe-8">
          <h2
            id="forgot-password-modal-title"
            className="text-2xl font-bold text-dark-green sm:text-[1.75rem]"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-green/70">
            {subtitleBefore}{" "}
            <button
              type="button"
              onClick={onOpenSignIn}
              className="font-semibold text-dark-green underline-offset-2 transition-colors hover:text-dark-green/80 hover:underline"
            >
              {signInLink}
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {emailLabel}
            </span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={emailPlaceholder}
              className={inputClassName}
              autoComplete="email"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
