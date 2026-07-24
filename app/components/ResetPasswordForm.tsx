"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

type ResetPasswordFormProps = {
  token: string;
};

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white/60 px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const {
    title,
    subtitle,
    passwordLabel,
    passwordPlaceholder,
    confirmPasswordLabel,
    confirmPasswordPlaceholder,
    submitLabel,
    successMessage,
    errorMessage,
    passwordMismatch,
    invalidTitle,
    invalidDescription,
    backToSignIn,
  } = useMessages().resetPassword;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (password !== confirmPassword) {
      toast.error(passwordMismatch);
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        if (response.status === 400) {
          setIsInvalid(true);
        }
        toast.error(data.error ?? errorMessage);
        return;
      }

      toast.success(successMessage);
      router.replace("/?signin=true");
    } catch {
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInvalid) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-full rounded-[2rem] border border-beige bg-white/70 px-6 py-10 shadow-sm sm:px-10">
          <h1 className="text-3xl font-bold tracking-tight text-dark-green">
            {invalidTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-dark-green/70 sm:text-base">
            {invalidDescription}
          </p>
          <Link
            href="/?signin=true"
            className="mt-8 inline-flex rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90"
          >
            {backToSignIn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full rounded-[2rem] border border-beige bg-white/70 px-6 py-10 shadow-sm sm:px-10">
        <h1 className="text-3xl font-bold tracking-tight text-dark-green">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dark-green/70 sm:text-base">
          {subtitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {passwordLabel}
            </span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
