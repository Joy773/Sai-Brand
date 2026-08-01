"use client";

import { useEffect, useState } from "react";
import { LuStar, LuX } from "react-icons/lu";

type RatingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rating: number) => void | Promise<void>;
};

export default function RatingModal({
  isOpen,
  onClose,
  onSelect,
}: RatingModalProps) {
  const [hovered, setHovered] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setHovered(0);
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSelect = (rating: number) => {
    onClose();
    void onSelect(rating);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-green/50 p-3 sm:p-4"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-modal-title"
        className="relative w-full max-w-sm rounded-3xl border border-beige bg-warm-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-dark-green/70 transition-colors hover:bg-beige/60 hover:text-dark-green"
          aria-label="Close"
        >
          <LuX className="h-5 w-5" aria-hidden />
        </button>

        <h2
          id="rating-modal-title"
          className="pe-8 text-xl font-bold text-dark-green sm:text-2xl"
        >
          Rate this product
        </h2>
        <p className="mt-2 text-sm text-dark-green/70">
          Tap a star to submit your rating.
        </p>

        <div
          className="mt-6 flex items-center justify-center gap-2"
          onMouseLeave={() => setHovered(0)}
          role="group"
          aria-label="Product rating"
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= hovered;

            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSelect(value)}
                onMouseEnter={() => setHovered(value)}
                onFocus={() => setHovered(value)}
                className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
              >
                <LuStar
                  className={`h-9 w-9 transition-colors ${
                    active
                      ? "fill-gold text-gold"
                      : "fill-transparent text-dark-green/25"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
