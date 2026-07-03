"use client";

import {
  LuBadgeCheck,
  LuFlaskConical,
  LuHeart,
  LuLeaf,
  LuPlane,
  LuShieldCheck,
  LuSun,
  LuWineOff,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { useMessages } from "@/app/i18n/LocaleProvider";

const iconMap: Record<string, IconType> = {
  "alcohol-fragrance-free": LuWineOff,
  vegan: LuLeaf,
  halal: LuBadgeCheck,
  "ihram-safe": LuShieldCheck,
  "cruelty-free": LuHeart,
  "dermatologically-tested": LuFlaskConical,
  "travel-friendly": LuPlane,
  "hot-climate": LuSun,
};

type TrustBatchItem = {
  id: string;
  label: string;
  description: string;
  hover: {
    id: string;
    label: string;
    description: string;
  };
};

const cardLift =
  "md:transition-all md:duration-300 md:ease-out md:hover:-translate-y-2 md:hover:shadow-xl motion-reduce:transition-none motion-reduce:md:hover:translate-y-0 motion-reduce:md:hover:shadow-none";

const contentFade =
  "md:transition-all md:duration-500 md:ease-in-out motion-reduce:transition-none";

function TrustCardContent({
  iconId,
  label,
  description,
}: {
  iconId: string;
  label: string;
  description: string;
}) {
  const Icon = iconMap[iconId];

  return (
    <>
      {Icon && (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dark-green/10 text-dark-green md:transition-transform md:duration-500 md:ease-in-out md:group-hover:scale-110 md:group-hover:bg-dark-green/15 motion-reduce:transition-none"
          aria-hidden
        >
          <Icon className="h-6 w-6 text-dark-green" />
        </div>
      )}
      <h3 className="flex min-h-[3.25rem] items-center justify-center text-lg font-semibold leading-snug text-dark-green sm:min-h-[3.5rem] sm:text-xl">
        {label}
      </h3>
      <p className="flex min-h-[5.5rem] flex-1 items-start justify-center text-sm leading-relaxed text-dark-green/70 sm:min-h-[6rem]">
        {description}
      </p>
    </>
  );
}

function TrustCard({
  item,
  className = "",
}: {
  item: TrustBatchItem;
  className?: string;
}) {
  return (
    <article
      className={`group relative min-h-[16.5rem] w-[min(78vw,20rem)] shrink-0 snap-start overflow-hidden rounded-3xl border border-beige bg-beige/40 sm:min-h-[17.5rem] sm:w-[20rem] md:w-auto ${cardLift} md:hover:border-dark-green/25 md:hover:bg-beige/70 md:hover:shadow-dark-green/10 ${className}`}
    >
      <div
        className={`flex h-full flex-col items-center gap-4 p-6 text-center sm:p-8 ${contentFade} md:group-hover:pointer-events-none md:group-hover:-translate-y-1 md:group-hover:opacity-0 motion-reduce:md:group-hover:translate-y-0 motion-reduce:md:group-hover:opacity-100`}
      >
        <TrustCardContent
          iconId={item.id}
          label={item.label}
          description={item.description}
        />
      </div>

      <div
        className={`absolute inset-0 hidden translate-y-2 flex-col items-center gap-4 p-6 text-center opacity-0 sm:p-8 md:flex ${contentFade} md:group-hover:translate-y-0 md:group-hover:opacity-100 motion-reduce:hidden`}
      >
        <TrustCardContent
          iconId={item.hover.id}
          label={item.hover.label}
          description={item.hover.description}
        />
      </div>
    </article>
  );
}

function MobileTrustCard({
  iconId,
  label,
  description,
}: {
  iconId: string;
  label: string;
  description: string;
}) {
  return (
    <article className="min-h-[16.5rem] w-[min(78vw,20rem)] shrink-0 snap-start rounded-3xl border border-beige bg-beige/40 sm:min-h-[17.5rem] sm:w-[20rem] md:hidden">
      <div className="flex h-full flex-col items-center gap-4 p-6 text-center sm:p-8">
        <TrustCardContent
          iconId={iconId}
          label={label}
          description={description}
        />
      </div>
    </article>
  );
}

export default function TrustBatch() {
  const { eyebrow, title, description, items } = useMessages().trustBatch;
  const mobileItems = items.flatMap((item) => [
    {
      id: item.id,
      label: item.label,
      description: item.description,
    },
    {
      id: item.hover.id,
      label: item.hover.label,
      description: item.hover.description,
    },
  ]);

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

        <div className="-mx-6 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-6 pb-3 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
          {mobileItems.map((item) => (
            <MobileTrustCard
              key={item.id}
              iconId={item.id}
              label={item.label}
              description={item.description}
            />
          ))}
          {items.map((item) => (
            <TrustCard key={item.id} item={item} className="hidden md:block" />
          ))}
        </div>
      </div>
    </section>
  );
}
