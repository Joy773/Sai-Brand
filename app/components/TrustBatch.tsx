"use client";

import { LuAward, LuLeaf, LuShieldCheck } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useMessages } from "@/app/i18n/LocaleProvider";

const iconMap: Record<string, IconType> = {
  "premium-ingredients": LuLeaf,
  "dermatologically-tested": LuShieldCheck,
  "german-standards": LuAward,
};

type TrustItem = {
  id: string;
  title: string;
  description: string;
  variant: "light" | "dark";
  icon?: IconType;
  highlight?: string;
};

const cardHover =
  "transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none";

function TrustCard({
  item,
  className = "",
}: {
  item: TrustItem;
  className?: string;
}) {
  if (item.variant === "dark") {
    return (
      <article
        className={`group relative overflow-hidden rounded-3xl bg-dark-green p-6 sm:p-8 md:p-10 ${cardHover} hover:shadow-dark-green/40 ${className}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-300 group-hover:opacity-30"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, #e5d5c5 0%, transparent 50%), radial-gradient(circle at 20% 80%, #e5d5c5 0%, transparent 40%)",
          }}
        />

        <div className="relative flex h-full min-h-[280px] flex-col justify-between gap-6 sm:min-h-0 sm:gap-8">
          <p className="text-4xl font-bold text-beige transition-transform duration-300 group-hover:scale-105 sm:text-5xl md:text-6xl">
            {item.highlight}
          </p>

          <div>
            <h3 className="text-lg font-semibold text-beige sm:text-xl md:text-2xl">
              {item.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-beige/70 sm:text-base">
              {item.description}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group rounded-3xl border border-beige bg-beige/40 p-6 sm:p-8 md:p-10 ${cardHover} hover:border-dark-green/25 hover:bg-beige/70 hover:shadow-dark-green/10 ${className}`}
    >
      {item.icon && (
        <div
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-dark-green/10 text-dark-green transition-all duration-300 group-hover:scale-110 group-hover:bg-dark-green/15"
          aria-hidden
        >
          <item.icon className="h-6 w-6 text-dark-green" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-dark-green sm:text-xl md:text-2xl">
        {item.title}
      </h3>
      <p className="mt-4 text-sm leading-relaxed text-dark-green/70 sm:text-base">
        {item.description}
      </p>
    </article>
  );
}

export default function TrustBatch() {
  const { eyebrow, title, description, items } = useMessages().trustBatch;

  const trustItems: TrustItem[] = items.map((item) => ({
    ...item,
    variant: item.variant as "light" | "dark",
    icon: iconMap[item.id],
  }));

  return (
    <section className="bg-warm-white px-6 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-bold text-dark-green sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-dark-green/70 sm:text-lg">
            {description}
          </p>
        </div>

        <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {trustItems.map((item) => (
            <TrustCard
              key={item.id}
              item={item}
              className="w-[85vw] max-w-[320px] shrink-0 snap-start"
            />
          ))}
        </div>

        <div className="hidden gap-5 md:grid md:grid-cols-2">
          {trustItems.map((item) => (
            <TrustCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
