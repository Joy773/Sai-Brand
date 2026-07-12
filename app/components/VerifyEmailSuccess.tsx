"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuCheck, LuLoader, LuX } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

type VerifyEmailSuccessProps = {
  email: string;
  autoLoginToken: string;
};

export default function VerifyEmailSuccess({
  email,
  autoLoginToken,
}: VerifyEmailSuccessProps) {
  const router = useRouter();
  const {
    successTitle,
    successDescription,
    redirecting,
    loginSuccess,
    loginFailed,
  } = useMessages().verifyEmail;
  const [status, setStatus] = useState<"signing-in" | "done" | "error">(
    "signing-in",
  );

  useEffect(() => {
    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const completeVerification = async () => {
      const result = await signIn("credentials", {
        email,
        autoLoginToken,
        redirect: false,
      });

      if (cancelled) {
        return;
      }

      if (result?.error) {
        setStatus("error");
        toast.error(loginFailed);
        return;
      }

      setStatus("done");
      toast.success(loginSuccess);

      redirectTimer = setTimeout(() => {
        if (typeof window !== "undefined" && window.opener) {
          window.close();
        }
        router.replace("/");
      }, 3000);
    };

    void completeVerification();

    return () => {
      cancelled = true;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [autoLoginToken, email, loginFailed, loginSuccess, router]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full rounded-[2rem] border border-beige bg-white/70 px-6 py-10 shadow-sm sm:px-10">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            status === "error" ? "bg-red-100 text-red-700" : "bg-dark-green/10 text-dark-green"
          }`}
        >
          {status === "signing-in" ? (
            <LuLoader className="h-8 w-8 animate-spin" aria-hidden />
          ) : status === "error" ? (
            <LuX className="h-8 w-8" aria-hidden />
          ) : (
            <LuCheck className="h-8 w-8" aria-hidden />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-dark-green">
          {successTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dark-green/70 sm:text-base">
          {successDescription}
        </p>
        <p className="mt-6 text-sm font-medium text-gold">
          {status === "error" ? loginFailed : redirecting}
        </p>
      </div>
    </div>
  );
}
