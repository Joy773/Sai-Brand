"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  clearPendingVerificationEmail,
  EMAIL_VERIFICATION_CHANNEL,
  getPendingVerificationEmail,
  type VerificationHandoffMessage,
} from "@/app/lib/emailVerificationHandoff";

export default function EmailVerificationHandoffListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(EMAIL_VERIFICATION_CHANNEL);

    channel.onmessage = async (event: MessageEvent<VerificationHandoffMessage>) => {
      const data = event.data;
      if (data?.type !== "offer") {
        return;
      }

      const pendingEmail = getPendingVerificationEmail();
      if (!pendingEmail || pendingEmail !== data.email.trim().toLowerCase()) {
        return;
      }

      channel.postMessage({
        type: "claim",
        email: data.email,
      } satisfies VerificationHandoffMessage);

      clearPendingVerificationEmail();

      const result = await signIn("credentials", {
        email: data.email,
        autoLoginToken: data.autoLoginToken,
        redirect: false,
      });

      if (result?.error) {
        toast.error(
          "Email verified, but automatic sign-in failed. Please sign in manually.",
        );
        return;
      }

      toast.success("Email verified. You are signed in.");
      window.focus();
      router.refresh();
    };

    return () => {
      channel.close();
    };
  }, [router]);

  return null;
}
