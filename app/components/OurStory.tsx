"use client";

import Link from "next/link";
import { useMessages } from "@/app/i18n/LocaleProvider";

const cardHover =
  "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none";

export default function WhySai() {
  const { eyebrow, title, description, learnMore, stats } =
    useMessages().ourStory;

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

          <div className="flex justify-center pt-2 lg:justify-start">
            <Link
              href={learnMore.href}
              className="inline-flex items-center rounded-full bg-dark-green px-6 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-dark-green/90"
            >
              {learnMore.label}
            </Link>
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
