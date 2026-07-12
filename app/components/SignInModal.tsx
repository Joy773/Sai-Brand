"use client";

import emailjs from "@emailjs/browser";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

type SignInModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignup?: () => void;
  onSuccess?: () => void;
};

type FormState = {
  email: string;
  password: string;
};

type VerificationSendResult = {
  ok?: boolean;
  error?: string;
  email?: string;
  verificationLink?: string;
  serviceId?: string;
  templateId?: string;
  publicKey?: string;
  useBrowserFallback?: boolean;
};

const initialFormState: FormState = {
  email: "",
  password: "",
};

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white/60 px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

async function sendViaBrowser(
  email: string,
  verificationLink: string,
  config: { serviceId: string; templateId: string; publicKey: string },
) {
  await emailjs.send(
    config.serviceId,
    config.templateId,
    {
      user_email: email,
      verification_link: verificationLink,
    },
    { publicKey: config.publicKey },
  );
}

async function sendVerificationEmail(email: string, password: string) {
  const response = await fetch("/api/send-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as VerificationSendResult;

  if (response.ok && data.ok) {
    return;
  }

  // Fallback: browser EmailJS using server-provided config (works on Vercel
  // even when NEXT_PUBLIC_* values were missing at build time)
  if (
    data.useBrowserFallback &&
    data.email &&
    data.verificationLink &&
    data.serviceId &&
    data.templateId &&
    data.publicKey
  ) {
    await sendViaBrowser(data.email, data.verificationLink, {
      serviceId: data.serviceId,
      templateId: data.templateId,
      publicKey: data.publicKey,
    });
    return;
  }

  throw new Error(data.error || "Failed to send verification email.");
}

export default function SignInModal({
  isOpen,
  onClose,
  onOpenSignup,
  onSuccess,
}: SignInModalProps) {
  const {
    title,
    subtitleBefore,
    signUpLink,
    emailLabel,
    emailPlaceholder,
    passwordLabel,
    passwordPlaceholder,
    submitLabel,
    close,
    successMessage,
    errorMessage,
    emailNotVerified,
  } = useMessages().signInModal;

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
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

  const handleUnverifiedLogin = async () => {
    try {
      await sendVerificationEmail(form.email, form.password);
      toast.success(emailNotVerified);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send verification email.";
      // eslint-disable-next-line no-console
      console.error("[SignInModal] verification email failed:", error);
      toast.error(message);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      try {
        const signInResult = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });

        if (signInResult?.error) {
          if (signInResult.code === "email_not_verified") {
            await handleUnverifiedLogin();
            return;
          }

          toast.error(errorMessage);
          return;
        }
      } catch {
        await handleUnverifiedLogin();
        return;
      }

      toast.success(successMessage);

      const callbackUrl = searchParams.get("callbackUrl");
      if (onSuccess) {
        onSuccess();
      } else if (callbackUrl?.startsWith("/")) {
        router.replace(callbackUrl);
      } else {
        onClose();
      }
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
        aria-labelledby="signin-modal-title"
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
            id="signin-modal-title"
            className="text-2xl font-bold text-dark-green sm:text-[1.75rem]"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-green/70">
            {subtitleBefore}{" "}
            <button
              type="button"
              onClick={onOpenSignup}
              className="font-semibold text-dark-green underline-offset-2 transition-colors hover:text-dark-green/80 hover:underline"
            >
              {signUpLink}
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
              autoComplete="current-password"
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
