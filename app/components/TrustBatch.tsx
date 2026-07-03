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
  "transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none";

const contentFade =
  "transition-all duration-500 ease-in-out motion-reduce:transition-none";

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
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dark-green/10 text-dark-green transition-transform duration-500 ease-in-out group-hover:scale-110 group-hover:bg-dark-green/15 motion-reduce:transition-none"
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

function TrustCard({ item }: { item: TrustBatchItem }) {
  return (
    <article
      className={`group relative min-h-[16.5rem] overflow-hidden rounded-3xl border border-beige bg-beige/40 sm:min-h-[17.5rem] ${cardLift} hover:border-dark-green/25 hover:bg-beige/70 hover:shadow-dark-green/10`}
    >
      <div
        className={`flex h-full flex-col items-center gap-4 p-6 text-center sm:p-8 ${contentFade} group-hover:pointer-events-none group-hover:-translate-y-1 group-hover:opacity-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:opacity-100`}
      >
        <TrustCardContent
          iconId={item.id}
          label={item.label}
          description={item.description}
        />
      </div>

      <div
        className={`absolute inset-0 flex translate-y-2 flex-col items-center gap-4 p-6 text-center opacity-0 sm:p-8 ${contentFade} group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:hidden`}
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

export default function TrustBatch() {
  const { eyebrow, title, description, items } = useMessages().trustBatch;

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

        <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-4 md:gap-5">
          {items.map((item) => (
            <TrustCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
