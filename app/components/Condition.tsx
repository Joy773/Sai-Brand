"use client";

import { useEffect, useState } from "react";
import {
  LuBan,
  LuBuilding,
  LuCircleAlert,
  LuCloudRain,
  LuCopyright,
  LuCreditCard,
  LuEuro,
  LuFileText,
  LuGavel,
  LuLandmark,
  LuMessageSquare,
  LuPackage,
  LuPencil,
  LuRefreshCw,
  LuRotateCcw,
  LuScale,
  LuScissors,
  LuShield,
  LuSprayCan,
  LuStore,
  LuTag,
  LuTruck,
  LuUser,
} from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";

const sectionIcons = [
  LuStore,
  LuFileText,
  LuPackage,
  LuSprayCan,
  LuBuilding,
  LuEuro,
  LuCreditCard,
  LuTruck,
  LuShield,
  LuRotateCcw,
  LuRefreshCw,
  LuCircleAlert,
  LuTag,
  LuUser,
  LuBan,
  LuCopyright,
  LuScale,
  LuCloudRain,
  LuMessageSquare,
  LuGavel,
  LuLandmark,
  LuScissors,
  LuPencil,
] as const;

type TermsSection = {
  id: string;
  label: string;
  paragraphs?: string[];
  items?: string[];
  itemsIntro?: string;
};

function renderTextWithEmail(text: string) {
  const emailMatch = text.match(/([^\s]+@[^\s]+)/i);
  if (!emailMatch) {
    return text;
  }

  const [email] = emailMatch;
  const parts = text.split(new RegExp(email, "i"));
  const before = parts[0] ?? "";
  const after = parts.slice(1).join(email);

  return (
    <>
      {before}
      <a
        href={`mailto:${email.toLowerCase()}`}
        className="font-medium text-dark-green underline underline-offset-2 hover:text-dark-green/80"
      >
        {email}
      </a>
      {after}
    </>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 ps-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SectionBody({ section }: { section: TermsSection }) {
  const paragraphs = section.paragraphs ?? [];
  const items = section.items ?? [];

  if (items.length > 0 && section.itemsIntro) {
    return (
      <div className="space-y-4">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{renderTextWithEmail(paragraph)}</p>
        ))}
        <p>{section.itemsIntro}</p>
        <BulletList items={items} />
      </div>
    );
  }

  if (items.length > 0) {
    return (
      <div className="space-y-4">
        {paragraphs[0] ? <p>{renderTextWithEmail(paragraphs[0])}</p> : null}
        <BulletList items={items} />
        {paragraphs.slice(1).map((paragraph) => (
          <p key={paragraph}>{renderTextWithEmail(paragraph)}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{renderTextWithEmail(paragraph)}</p>
      ))}
    </div>
  );
}

export default function Condition() {
  const { title, lastUpdated, paragraphs, quickNavigation, sections } =
    useMessages().termsConditions;
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    setActiveId(id);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section className="bg-[#F3E8DF] px-6 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-dark-green/10 sm:h-20 sm:w-20">
            <LuFileText
              className="h-8 w-8 text-dark-green sm:h-10 sm:w-10"
              aria-hidden
            />
          </div>

          <h1 className="text-3xl font-bold text-dark-green sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          <p className="mt-4 text-sm text-dark-green/70 sm:text-base">
            {lastUpdated}
          </p>

          <p className="mt-6 text-base leading-relaxed text-dark-green/80 sm:text-lg">
            {paragraphs.join(" ")}
          </p>
        </div>
      </section>

      <section className="bg-beige/20 px-6 py-12 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-10">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav
              aria-label={quickNavigation}
              className="rounded-2xl border border-beige bg-warm-white p-5 shadow-lg shadow-dark-green/5 sm:p-6"
            >
              <h2 className="text-lg font-bold text-dark-green">
                {quickNavigation}
              </h2>

              <ul className="mt-4 max-h-[70vh] space-y-1 overflow-y-auto">
                {sections.map((section, index) => {
                  const Icon = sectionIcons[index] ?? LuFileText;
                  const isActive = activeId === section.id;

                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors sm:text-[15px] ${
                          isActive
                            ? "bg-dark-green text-warm-white"
                            : "text-dark-green/80 hover:bg-beige/50 hover:text-dark-green"
                        }`}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span>{section.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <div className="space-y-6">
            {sections.map((section, index) => {
              const Icon = sectionIcons[index] ?? LuFileText;

              return (
                <article
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 rounded-2xl border border-beige bg-warm-white p-6 shadow-sm sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-dark-green/10">
                      <Icon className="h-5 w-5 text-dark-green" aria-hidden />
                    </div>
                    <h3 className="text-xl font-bold text-dark-green sm:text-2xl">
                      {section.label}
                    </h3>
                  </div>

                  <div className="mt-4 text-sm leading-relaxed text-dark-green/80 sm:text-base">
                    <SectionBody section={section} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
