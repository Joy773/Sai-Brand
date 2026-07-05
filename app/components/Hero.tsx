"use client";

import Image from "next/image";
import Link from "next/link";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { KIT_SLUG } from "@/app/lib/products";
import { handleSectionClick } from "@/app/lib/scrollToSection";

const productsHref = "#products";

const badgeHover =
  "transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-warm-white hover:shadow-md hover:shadow-dark-green/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm";

const badgeIconHover =
  "transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100";

const badgeIconMap: Record<string, string> = {
  "made-in-germany": "/Germany.png",
  "premium-quality": "/Premium.png",
  "alcohol-free": "/Alcohol-Free.png",
  "fragrance-free": "/Fregnance-Free.png",
  halal: "/Halal.png",
  vegan: "/Vegan.png",
  "ihram-safe": "/Ihmram-Safe.png",
};

export default function Hero() {
  const hero = useMessages().hero;

  return (
    <section id="hero" className="grid bg-[#F1E5DC] md:min-h-[calc(100svh-4rem)] md:grid-cols-2">
      <div className="order-2 flex flex-col items-center justify-start gap-4 bg-[#F1E5DC] px-6 pb-10 pt-4 text-center sm:px-10 sm:pb-12 sm:pt-6 md:order-1 md:min-h-[calc(100svh-4rem)] md:items-start md:justify-center md:px-12 md:py-16 md:text-left lg:px-16 xl:px-20">
        <h1 className="text-3xl font-bold leading-tight text-dark-green sm:text-4xl lg:text-5xl xl:text-6xl">
          {hero.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-dark-green/70 md:mx-0 sm:text-base lg:text-lg">
          {hero.subheading}
        </p>

        <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap md:justify-start">
          <Link
            href={productsHref}
            onClick={(event) => handleSectionClick(event, productsHref)}
            className="inline-flex items-center justify-center rounded-full bg-dark-green px-7 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-dark-green/90 sm:w-auto"
          >
            {hero.shopNow.label}
          </Link>
          <Link
            href={`/${KIT_SLUG}`}
            className="inline-flex items-center justify-center rounded-full border border-dark-green/30 bg-transparent px-7 py-3 text-sm font-medium text-dark-green transition-colors hover:border-gold hover:text-gold sm:w-auto"
          >
            {hero.exploreProducts.label}
          </Link>
        </div>

        <ul className="flex max-w-xl flex-wrap justify-center gap-2 pt-2 md:justify-start">
          {hero.badges
            .filter((badge) => badgeIconMap[badge.id])
            .map((badge) => (
              <li
                key={badge.id}
                className={`group inline-flex cursor-default items-center gap-2 rounded-full border border-transparent bg-warm-white/90 px-3 py-2 text-xs font-bold text-dark-green shadow-sm sm:px-3.5 sm:py-2.5 sm:text-sm ${badgeHover} hover:border-dark-green/15`}
              >
                <Image
                  src={badgeIconMap[badge.id]}
                  alt=""
                  width={28}
                  height={28}
                  className={`h-6 w-6 shrink-0 rounded-full object-contain sm:h-7 sm:w-7 ${badgeIconHover}`}
                  unoptimized
                  aria-hidden
                />
                <span className="whitespace-nowrap">{badge.label}</span>
              </li>
            ))}
        </ul>
      </div>

      <div className="order-1 flex w-full items-end justify-center bg-[#F1E5DC] pt-6 md:order-2 md:min-h-[calc(100svh-4rem)] md:items-center md:pt-0">
        <Image
          src="/hero-img.png"
          alt={hero.imageAlt}
          width={1920}
          height={1440}
          priority
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized
        />
      </div>
    </section>
  );
}
