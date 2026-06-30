"use client";

import Image from "next/image";
import Link from "next/link";
import { useMessages } from "@/app/i18n/LocaleProvider";

export default function Hero() {
  const hero = useMessages().hero;

  return (
    <section id="hero" className="relative min-h-[calc(100svh-4rem)] w-full overflow-hidden bg-warm-white md:h-[calc(100svh-4rem)]">
      <Image
        src="/Hero.jpg"
        alt={hero.imageAlt}
        fill
        priority
        className="object-cover object-[75%_center] md:object-center"
        sizes="100vw"
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-warm-white/90 via-warm-white/50 to-warm-white/20 md:hidden"
        aria-hidden
      />

      <div className="absolute inset-0 flex items-center justify-center px-4 pb-20 pt-16 sm:px-6 md:items-center md:justify-start md:pb-0 md:pt-0 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mx-auto flex w-full max-w-lg -translate-y-10 flex-col gap-4 text-center sm:gap-5 md:mx-0 md:translate-y-0 md:gap-6 md:text-left rtl:md:text-right">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.15em] text-dark-green/80 sm:text-xs sm:tracking-[0.2em]">
              {hero.eyebrow}
            </p>

            <h1 className="text-3xl font-bold leading-tight text-dark-green sm:text-4xl md:text-5xl lg:text-6xl">
              {hero.headline.map((line) => (
                <span key={line} className="block md:whitespace-nowrap">
                  {line}
                </span>
              ))}
            </h1>

            <p className="text-sm leading-relaxed text-dark-green/70 sm:text-base md:text-lg">
              {hero.description}
            </p>

            <div className="flex flex-col gap-3 pt-1 text-start sm:flex-row sm:flex-wrap sm:gap-4 sm:pt-2">
              <Link
                href={hero.shopNow.href}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-dark-green px-6 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-dark-green/90 sm:w-auto"
              >
                {hero.shopNow.label}
              </Link>
              <Link
                href={hero.exploreProducts.href}
                className="inline-flex items-center justify-center rounded-full border border-dark-green/30 bg-transparent px-6 py-3 text-sm font-medium text-dark-green transition-colors hover:border-gold hover:text-gold sm:w-auto"
              >
                {hero.exploreProducts.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
