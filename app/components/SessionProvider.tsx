"use client";

import { SessionProvider } from "next-auth/react";
import EmailVerificationHandoffListener from "@/app/components/EmailVerificationHandoffListener";

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <EmailVerificationHandoffListener />
      {children}
    </SessionProvider>
  );
}
