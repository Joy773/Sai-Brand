"use client";

import { LuFileText } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";

export default function ConditionHero() {
  const { title, lastUpdated, paragraphs } = useMessages().termsConditions;

  return (
    <section className="bg-[#F3E8DF] px-6 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-dark-green/10 sm:h-20 sm:w-20">
          <LuFileText
            className="h-8 w-8 text-dark-green sm:h-10 sm:w-10"
            aria-hidden
          />
        </div>

        <h1 className="text-3xl font-bold text-dark-green sm:text-4xl lg:text-5xl">
          {title}
        </h1>

        <p className="mt-4 text-sm text-dark-green/70 sm:text-base">
          {lastUpdated}
        </p>

        <p className="mt-6 text-base leading-relaxed text-dark-green/80 sm:text-lg">
          {paragraphs.join(" ")}
        </p>
      </div>
    </section>
  );
}
