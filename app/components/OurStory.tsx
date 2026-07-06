"use client";

import { useState } from "react";
import { useMessages } from "@/app/i18n/LocaleProvider";

const cardHover =
  "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none";

export default function WhySai() {
  const { eyebrow, title, description, learnMore, learnMoreContent, stats } =
    useMessages().ourStory;
  const [showLearnMore, setShowLearnMore] = useState(false);

  return (
    <section id="about" className="bg-warm-white px-6 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6 text-center lg:text-start">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            {eyebrow}
          </p>

          <h2 className="text-3xl font-bold leading-tight text-dark-green sm:text-4xl lg:text-5xl">
            {title}
          </h2>

          <p className="text-base leading-relaxed text-dark-green/70 sm:text-lg">
            {description}
          </p>

          <div
            className={`grid transition-all duration-500 ease-in-out motion-reduce:transition-none ${
              showLearnMore
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!showLearnMore}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 text-base leading-relaxed text-dark-green/70 sm:text-lg">
                {learnMoreContent.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2 lg:justify-start">
            <button
              type="button"
              onClick={() => setShowLearnMore((current) => !current)}
              className="inline-flex items-center rounded-full bg-dark-green px-6 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-dark-green/90"
              aria-expanded={showLearnMore}
            >
              {showLearnMore ? learnMore.showLess : learnMore.label}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {stats.map((stat) => (
            <article
              key={stat.value}
              className={`rounded-3xl border border-beige bg-beige/40 p-5 sm:p-6 ${cardHover} hover:border-dark-green/20 hover:bg-beige/70`}
            >
              <p className="text-3xl font-bold text-dark-green sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-dark-green/70 sm:text-base">
                {stat.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
