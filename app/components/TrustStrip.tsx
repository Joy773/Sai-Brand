"use client";

import {
  LuBadgeCheck,
  LuGem,
  LuLeaf,
  LuMapPin,
  LuShieldCheck,
  LuWind,
  LuWineOff,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { useMessages } from "@/app/i18n/LocaleProvider";

const iconMap: Record<string, IconType> = {
  "alcohol-free": LuWineOff,
  "fragrance-free": LuWind,
  halal: LuBadgeCheck,
  vegan: LuLeaf,
  "ihram-safe": LuShieldCheck,
  "made-in-germany": LuMapPin,
  "premium-quality": LuGem,
};

type TrustStripItem = {
  id: string;
  label: string;
  icon: IconType;
};

const TRACK_REPEAT_COUNT = 3;
const MARQUEE_BASE_DURATION_S = 35;

function repeatItems(items: TrustStripItem[], times: number) {
  return Array.from({ length: times }, (_, rep) =>
    items.map((item) => ({ ...item, rep }))
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
      {repeatedItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={`${trackId}-${item.rep}-${item.id}`}
            className="flex shrink-0 items-center gap-2 text-sm font-medium text-warm-white sm:text-base"
          >
            <Icon className="h-4 w-4 shrink-0 text-gold sm:h-5 sm:w-5" aria-hidden />
            <span className="whitespace-nowrap">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function TrustStrip() {
  const { ariaLabel, items } = useMessages().trustStrip;

  const trustItems: TrustStripItem[] = items.map((item) => ({
    ...item,
    icon: iconMap[item.id],
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
