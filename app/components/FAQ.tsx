"use client";

import Link from "next/link";
import { useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";

type FaqItem = {
  question: string;
  answer: string;
};

function FaqAccordion({
  faqs,
  openIndex,
  onToggle,
  startIndex = 0,
}: {
  faqs: FaqItem[];
  openIndex: number | null;
  onToggle: (index: number) => void;
  startIndex?: number;
}) {
  return (
    <>
      {faqs.map((faq, index) => {
        const faqIndex = startIndex + index;
        const isOpen = openIndex === faqIndex;

        return (
          <article
            key={faq.question}
            className="overflow-hidden rounded-2xl border border-beige bg-warm-white transition-colors hover:border-dark-green/20"
          >
            <button
              type="button"
              onClick={() => onToggle(faqIndex)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start sm:px-6 sm:py-5"
              aria-expanded={isOpen}
            >
              <span className="text-base font-semibold text-dark-green sm:text-lg">
                {faq.question}
              </span>
              <LuChevronDown
                className={`h-5 w-5 shrink-0 text-dark-green transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-relaxed text-dark-green/70 sm:px-6 sm:pb-5 sm:text-base">
                  {faq.answer}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </>
  );
}

export default function FAQ() {
  const {
    eyebrow,
    title,
    description,
    contactUs,
    viewMore,
    viewLess,
    items,
    moreItems,
  } = useMessages().faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [showMore, setShowMore] = useState(false);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  const handleToggleMore = () => {
    setShowMore((current) => {
      if (current && openIndex !== null && openIndex >= items.length) {
        setOpenIndex(null);
      }
      return !current;
    });
  };

  return (
    <section id="faqs" className="bg-beige/30 px-6 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:sticky lg:top-24 lg:text-start">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-bold text-dark-green sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-dark-green/70 sm:text-lg">
            {description}
          </p>

          <div className="mt-6 flex justify-center lg:justify-start">
            <Link
              href={contactUs.href}
              className="inline-flex items-center rounded-full bg-dark-green px-6 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-dark-green/90"
            >
              {contactUs.label}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <FaqAccordion
            faqs={items}
            openIndex={openIndex}
            onToggle={toggle}
            startIndex={0}
          />

          <div
            className={`grid transition-all duration-500 ease-in-out motion-reduce:transition-none ${
              showMore
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!showMore}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-3 pt-0">
                <FaqAccordion
                  faqs={moreItems}
                  openIndex={openIndex}
                  onToggle={toggle}
                  startIndex={items.length}
                />
              </div>
            </div>
          </div>

          {moreItems.length > 0 && (
            <button
              type="button"
              onClick={handleToggleMore}
              className="mt-1 inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-dark-green/20 bg-warm-white px-4 py-2 text-xs font-medium text-dark-green transition-colors hover:border-dark-green/40 hover:bg-beige/50 sm:text-sm"
              aria-expanded={showMore}
            >
              {showMore ? viewLess : viewMore}
              <LuChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-300 ${
                  showMore ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
