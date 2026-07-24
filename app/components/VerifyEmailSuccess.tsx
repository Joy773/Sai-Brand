"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuCheck, LuLoader, LuX } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";
import {
  EMAIL_VERIFICATION_CHANNEL,
  type VerificationHandoffMessage,
} from "@/app/lib/emailVerificationHandoff";

type VerifyEmailSuccessProps = {
  email: string;
  autoLoginToken: string;
};

const HANDOFF_WAIT_MS = 800;

export default function VerifyEmailSuccess({
  email,
  autoLoginToken,
}: VerifyEmailSuccessProps) {
  const router = useRouter();
  const {
    successTitle,
    successDescription,
    handoffDescription,
    redirecting,
    continueInOtherTab,
    loginSuccess,
    loginFailed,
  } = useMessages().verifyEmail;
  const [status, setStatus] = useState<
    "signing-in" | "handed-off" | "done" | "error"
  >("signing-in");

  useEffect(() => {
    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    let channel: BroadcastChannel | undefined;

    const completeOnThisTab = async () => {
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

    const tryHandoffToSignupTab = async () => {
      if (typeof BroadcastChannel === "undefined") {
        await completeOnThisTab();
        return;
      }

      channel = new BroadcastChannel(EMAIL_VERIFICATION_CHANNEL);

      const claimed = await new Promise<boolean>((resolve) => {
        const timeout = window.setTimeout(() => resolve(false), HANDOFF_WAIT_MS);

        channel!.onmessage = (
          event: MessageEvent<VerificationHandoffMessage>,
        ) => {
          const data = event.data;
          if (
            data?.type === "claim" &&
            data.email.trim().toLowerCase() === email.trim().toLowerCase()
          ) {
            window.clearTimeout(timeout);
            resolve(true);
          }
        };

        channel!.postMessage({
          type: "offer",
          email,
          autoLoginToken,
        } satisfies VerificationHandoffMessage);
      });

      channel.close();
      channel = undefined;

      if (cancelled) {
        return;
      }

      if (claimed) {
        setStatus("handed-off");
        redirectTimer = setTimeout(() => {
          if (typeof window !== "undefined") {
            window.close();
          }
        }, 2500);
        return;
      }

      await completeOnThisTab();
    };

    void tryHandoffToSignupTab();

    return () => {
      cancelled = true;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
      channel?.close();
    };
  }, [autoLoginToken, email, loginFailed, loginSuccess, router]);

  const description =
    status === "handed-off" ? handoffDescription : successDescription;
  const statusLabel =
    status === "error"
      ? loginFailed
      : status === "handed-off"
        ? continueInOtherTab
        : redirecting;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full rounded-[2rem] border border-beige bg-white/70 px-6 py-10 shadow-sm sm:px-10">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            status === "error"
              ? "bg-red-100 text-red-700"
              : "bg-dark-green/10 text-dark-green"
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
          {description}
        </p>
        <p className="mt-6 text-sm font-medium text-gold">{statusLabel}</p>
      </div>
    </div>
  );
}
