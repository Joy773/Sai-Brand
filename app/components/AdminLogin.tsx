"use client";

import Image from "next/image";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

type FormState = {
  email: string;
  password: string;
};

type ResetStep = "signin" | "otp" | "reset";

const initialFormState: FormState = {
  email: "",
  password: "",
};

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

export default function AdminLogin() {
  const {
    title,
    subtitle,
    emailLabel,
    emailPlaceholder,
    passwordLabel,
    passwordPlaceholder,
    forgotPasswordLink,
    forgotPasswordSending,
    forgotPasswordSuccess,
    forgotPasswordError,
    otpTitle,
    otpSubtitle,
    otpLabel,
    otpPlaceholder,
    otpSubmitLabel,
    otpVerifying,
    otpError,
    otpSuccess,
    resetTitle,
    resetSubtitle,
    newPasswordLabel,
    newPasswordPlaceholder,
    confirmPasswordLabel,
    confirmPasswordPlaceholder,
    resetSubmitLabel,
    resetSaving,
    resetSuccess,
    resetError,
    backToSignIn,
    submitLabel,
    successMessage,
    errorMessage,
    notAdminError,
  } = useMessages().adminLogin;

  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [step, setStep] = useState<ResetStep>("signin");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async () => {
    if (isSendingOtp || isSubmitting || isVerifyingOtp || isResettingPassword) {
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? forgotPasswordError);
      }

      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
      setStep("otp");
      toast.success(forgotPasswordSuccess);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : forgotPasswordError,
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isVerifyingOtp) {
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const response = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        resetToken?: string;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.resetToken) {
        throw new Error(data.error ?? otpError);
      }

      setResetToken(data.resetToken);
      setStep("reset");
      toast.success(otpSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : otpError);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isResettingPassword) {
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(resetError);
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          password: newPassword,
          confirmPassword,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? resetError);
      }

      toast.success(resetSuccess);
      setStep("signin");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : resetError);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const signInResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error(errorMessage);
        return;
      }

      const session = await getSession();

      if (session?.user?.role !== "admin") {
        const { signOut } = await import("next-auth/react");
        await signOut({ redirect: false });
        toast.error(notAdminError);
        return;
      }

      toast.success(successMessage);
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3E8DF] px-6 py-12">
      <div className="mb-8">
        <Image
          src="/German_Care_Logo_Print-page.png"
          alt="German Care"
          width={900}
          height={165}
          className="h-12 w-auto object-contain sm:h-14"
          unoptimized
          priority
        />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-beige bg-warm-white p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-green sm:text-[1.75rem]">
            {step === "otp"
              ? otpTitle
              : step === "reset"
                ? resetTitle
                : title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-dark-green/70">
            {step === "otp"
              ? otpSubtitle
              : step === "reset"
                ? resetSubtitle
                : subtitle}
          </p>
        </div>

        {step === "signin" ? (
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
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
                placeholder={passwordPlaceholder}
                className={inputClassName}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={isSendingOtp || isSubmitting}
                className="text-sm font-semibold text-dark-green underline-offset-2 transition-colors hover:text-dark-green/80 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingOtp ? forgotPasswordSending : forgotPasswordLink}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </form>
        ) : null}

        {step === "otp" ? (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                {otpLabel}
              </span>
              <input
                type="text"
                name="otp"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder={otpPlaceholder}
                className={inputClassName}
                autoComplete="one-time-code"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isVerifyingOtp || otp.length !== 4}
              className="mt-2 w-full rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVerifyingOtp ? otpVerifying : otpSubmitLabel}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("signin");
                setOtp("");
              }}
              className="w-full text-sm font-semibold text-dark-green/70 transition-colors hover:text-dark-green"
            >
              {backToSignIn}
            </button>
          </form>
        ) : null}

        {step === "reset" ? (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                {newPasswordLabel}
              </span>
              <input
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={newPasswordPlaceholder}
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
              disabled={isResettingPassword}
              className="mt-2 w-full rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResettingPassword ? resetSaving : resetSubmitLabel}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("signin");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
                setResetToken("");
              }}
              className="w-full text-sm font-semibold text-dark-green/70 transition-colors hover:text-dark-green"
            >
              {backToSignIn}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
