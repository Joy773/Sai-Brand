"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn?: () => void;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white/60 px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

export default function SignupModal({
  isOpen,
  onClose,
  onOpenSignIn,
}: SignupModalProps) {
  const {
    title,
    subtitleBefore,
    signInLink,
    nameLabel,
    namePlaceholder,
    emailLabel,
    emailPlaceholder,
    passwordLabel,
    passwordPlaceholder,
    confirmPasswordLabel,
    confirmPasswordPlaceholder,
    submitLabel,
    close,
    successMessage,
    errorMessage,
    passwordMismatch,
  } = useMessages().signupModal;

  const dialogRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
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
      setForm(initialFormState);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

    if (form.password !== form.confirmPassword) {
      toast.error(passwordMismatch);
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
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
        aria-labelledby="signup-modal-title"
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
            id="signup-modal-title"
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
              {nameLabel}
            </span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder={namePlaceholder}
              className={inputClassName}
              autoComplete="name"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {emailLabel}
            </span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder={emailPlaceholder}
              className={inputClassName}
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {passwordLabel}
            </span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder={passwordPlaceholder}
              className={inputClassName}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {confirmPasswordLabel}
            </span>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={(event) =>
                updateField("confirmPassword", event.target.value)
              }
              placeholder={confirmPasswordPlaceholder}
              className={inputClassName}
              autoComplete="new-password"
              minLength={8}
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
