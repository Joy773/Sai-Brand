"use client";

import Image from "next/image";
import { useMessages } from "@/app/i18n/LocaleProvider";

const iconMap: Record<string, string> = {
  "alcohol-free": "/Alcohol-Free.png",
  "fragrance-free": "/Fregnance-Free.png",
  halal: "/Halal.png",
  vegan: "/Vegan.png",
  "ihram-safe": "/Ihmram-Safe.png",
  "made-in-germany": "/Germany.png",
  "dermatology-tested": "/Dermatology-Tested.png",
  "premium-quality": "/Premium.png",
};

export default function TrustStrip() {
  const { ariaLabel, items } = useMessages().trustStrip;

  const trustItems = items
    .filter((item) => iconMap[item.id])
    .map((item) => ({
      ...item,
      iconSrc: iconMap[item.id],
    }));

  return (
    <div
      className="overflow-x-auto bg-dark-green py-3 sm:py-3.5"
      aria-label={ariaLabel}
    >
      <div className="mx-auto flex w-max min-w-full max-w-7xl flex-nowrap items-center justify-center gap-x-5 px-4 sm:gap-x-6 lg:justify-between lg:gap-x-4">
        {trustItems.map((item) => (
          <div
            key={item.id}
            className="flex shrink-0 items-center gap-2 text-xs font-medium text-warm-white sm:gap-2.5 sm:text-sm lg:text-base"
          >
            <Image
              src={item.iconSrc}
              alt=""
              width={36}
              height={36}
              className="h-7 w-7 shrink-0 rounded-full object-contain sm:h-8 sm:w-8 lg:h-9 lg:w-9"
              unoptimized
              aria-hidden
            />
            <span className="whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
