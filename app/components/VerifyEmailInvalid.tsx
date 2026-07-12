"use client";

import Link from "next/link";
import { LuX } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";

export default function VerifyEmailInvalid() {
  const { invalidTitle, invalidDescription, goHome } = useMessages().verifyEmail;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full rounded-[2rem] border border-beige bg-white/70 px-6 py-10 shadow-sm sm:px-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700">
          <LuX className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-dark-green">
          {invalidTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dark-green/70 sm:text-base">
          {invalidDescription}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-dark-green px-6 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90"
        >
          {goHome}
        </Link>
      </div>
    </div>
  );
}
