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

type TrustStripItem = {
  id: string;
  label: string;
  iconSrc: string;
  rep?: number;
};

const TRACK_REPEAT_COUNT = 3;
const MARQUEE_BASE_DURATION_S = 35;

function repeatItems(items: TrustStripItem[], times: number) {
  return Array.from({ length: times }, (_, rep) =>
    items.map((item) => ({ ...item, rep })),
  ).flat();
}

function TrustStripTrack({
  trackId,
  items,
  hidden = false,
}: {
  trackId: string;
  items: TrustStripItem[];
  hidden?: boolean;
}) {
  const repeatedItems = repeatItems(items, TRACK_REPEAT_COUNT);

  return (
    <div
      className="flex shrink-0 items-center gap-8 pr-8"
      aria-hidden={hidden || undefined}
    >
      {repeatedItems.map((item) => (
        <div
          key={`${trackId}-${item.rep}-${item.id}`}
          className="flex shrink-0 items-center gap-2.5 text-sm font-medium text-warm-white sm:gap-3 sm:text-base"
        >
          <Image
            src={item.iconSrc}
            alt=""
            width={36}
            height={36}
            className="h-8 w-8 shrink-0 rounded-full object-contain sm:h-9 sm:w-9"
            unoptimized
            aria-hidden
          />
          <span className="whitespace-nowrap">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrustStrip() {
  const { ariaLabel, items } = useMessages().trustStrip;

  const trustItems: TrustStripItem[] = items
    .filter((item) => iconMap[item.id])
    .map((item) => ({
      ...item,
      iconSrc: iconMap[item.id],
    }));

  return (
    <div
      className="overflow-hidden bg-dark-green py-3 sm:py-3.5"
      aria-label={ariaLabel}
    >
      <div
        className="trust-strip-marquee flex w-max"
        style={
          {
            "--trust-strip-duration": `${MARQUEE_BASE_DURATION_S * TRACK_REPEAT_COUNT}s`,
          } as React.CSSProperties
        }
      >
        <TrustStripTrack trackId="a" items={trustItems} />
        <TrustStripTrack trackId="b" items={trustItems} hidden />
      </div>
    </div>
  );
}
