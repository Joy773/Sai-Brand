"use client";

import Link from "next/link";
import { useMessages } from "@/app/i18n/LocaleProvider";

export default function CTA() {
  const { title, description, shopNow, exploreProducts } = useMessages().cta;

  return (
    <section id="contact" className="bg-warm-white px-6 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto w-full max-w-7xl rounded-3xl bg-dark-green px-6 py-12 text-center sm:px-10 sm:py-14 lg:px-16 lg:py-16">
        <h2 className="text-3xl font-bold leading-tight text-warm-white sm:text-4xl lg:text-5xl">
          {title}
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-beige/90 sm:text-lg">
          {description}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <Link
            href={shopNow.href}
            className="inline-flex w-full items-center justify-center rounded-full bg-warm-white px-6 py-3 text-sm font-medium text-dark-green transition-colors hover:bg-beige sm:w-auto"
          >
            {shopNow.label}
          </Link>
          <Link
            href={exploreProducts.href}
            className="inline-flex w-full items-center justify-center rounded-full border border-beige/60 bg-transparent px-6 py-3 text-sm font-medium text-beige transition-colors hover:border-beige hover:text-warm-white sm:w-auto"
          >
            {exploreProducts.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
