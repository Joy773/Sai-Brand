"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  LuArrowLeft,
  LuCheck,
  LuMinus,
  LuPlus,
  LuShoppingCart,
} from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { getKitProductTags, KIT_SLUG, productSlugs, type CatalogSlug } from "@/app/lib/products";
import ProductTags from "@/app/components/ProductTags";

const kitImages = ["/kit-1.png", "/kit-2.png", "/kit-3.png", "/kit-4.png"];

const tabIds = [
  "keyBenefits",
  "howToUse",
  "ingredients",
  "safetyNotes",
] as const;

type TabId = (typeof tabIds)[number];

type IngredientGroup = {
  name: string;
  list: string;
};

function isStringList(content: unknown): content is string[] {
  return (
    Array.isArray(content) &&
    content.every((item) => typeof item === "string")
  );
}

function isIngredientGroups(content: unknown): content is IngredientGroup[] {
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        "list" in item &&
        typeof item.name === "string" &&
        typeof item.list === "string",
    )
  );
}

type ProductDetailProps = {
  slug: CatalogSlug;
};

export default function ProductDetail({ slug }: ProductDetailProps) {
  const { products, productPage } = useMessages();
  const [activeTab, setActiveTab] = useState<TabId>("keyBenefits");
  const [quantity, setQuantity] = useState(1);
  const isKit = slug === KIT_SLUG;

  const product = isKit
    ? {
        name: products.kit.name,
        description: products.kit.description,
        price: products.kit.price,
        size: products.kit.size,
        image: kitImages[0],
        includes: products.kit.includes,
        tags: getKitProductTags(products.items),
        details: products.kit.details,
      }
    : products.items.find((item) => productSlugs[slug] === item.image);

  if (!product) {
    return null;
  }

  const activeContent = product.details?.[activeTab];
  const decreaseQuantity = () => setQuantity((current) => Math.max(1, current - 1));
  const increaseQuantity = () => setQuantity((current) => current + 1);

  return (
    <main className="flex-1 px-6 py-10 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/#products"
          className="inline-flex items-center gap-2 text-sm font-medium text-dark-green/70 transition-colors hover:text-dark-green"
        >
          <LuArrowLeft className="h-4 w-4" aria-hidden />
          {productPage.backToProducts}
        </Link>

        <article className="mt-8 flex flex-col overflow-hidden rounded-2xl bg-warm-white sm:rounded-3xl lg:mt-10 lg:flex-row lg:items-start lg:overflow-visible">
          <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-beige/40 p-6 sm:p-8 lg:sticky lg:top-8 lg:aspect-auto lg:h-[32rem] lg:w-1/2 lg:rounded-l-3xl">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              unoptimized
            />
          </div>

          <div className="flex flex-1 flex-col p-6 sm:p-8 lg:p-10">
            <h1 className="text-2xl font-bold text-dark-green sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-dark-green/70 sm:text-lg">
              {product.description}
            </p>

            {"tags" in product ? <ProductTags tags={product.tags} /> : null}

            {"includes" in product && product.includes ? (
              <ul className="mt-6 space-y-2">
                {product.includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-dark-green sm:text-base"
                  >
                    <LuCheck
                      className="h-4 w-4 shrink-0 text-gold"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 space-y-4 sm:mt-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="order-2 px-4 py-3 sm:order-1">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-dark-green/50">
                    {productPage.size}
                  </p>
                  <p className="mt-1 text-base font-semibold text-dark-green">
                    {product.size}
                  </p>
                </div>

                <div className="order-1 px-4 py-3 sm:order-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-dark-green/50">
                    {productPage.price}
                  </p>
                  <p className="mt-1 text-base font-semibold text-dark-green">
                    {product.price}
                  </p>
                </div>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="w-[9.5rem] rounded-2xl border border-dark-green/10 px-4 py-3 sm:w-auto">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-dark-green/50">
                    {productPage.quantity}
                  </p>
                  <div className="mt-1 flex items-center justify-start gap-3">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      aria-label={productPage.decreaseQuantity}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dark-green/20 text-dark-green transition-colors hover:border-dark-green"
                    >
                      <LuMinus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="text-base font-semibold text-dark-green">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={increaseQuantity}
                      aria-label={productPage.increaseQuantity}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dark-green/20 text-dark-green transition-colors hover:border-dark-green"
                    >
                      <LuPlus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex w-fit min-w-0 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-dark-green px-5 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-dark-green/90 sm:w-auto sm:self-auto sm:px-6"
                >
                  <LuShoppingCart className="h-4 w-4" aria-hidden />
                  {productPage.addToCart}
                </button>
              </div>
            </div>

            {product.details ? (
              <>
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {tabIds.map((tabId) => (
                    <button
                      key={tabId}
                      type="button"
                      onClick={() => setActiveTab(tabId)}
                      aria-pressed={activeTab === tabId}
                      className={`rounded-full border px-3 py-2.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                        activeTab === tabId
                          ? "border-dark-green bg-dark-green text-warm-white"
                          : "border-dark-green/25 bg-transparent text-dark-green hover:border-dark-green/50"
                      }`}
                    >
                      {productPage.tabs[tabId]}
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-dark-green/10 bg-beige/20 p-4 sm:p-5">
                  {activeTab === "keyBenefits" && isStringList(activeContent) ? (
                    <ul className="space-y-2">
                      {activeContent.map((benefit) => (
                        <li
                          key={benefit}
                          className="flex items-start gap-2 text-sm leading-relaxed text-dark-green/80 sm:text-base"
                        >
                          <LuCheck
                            className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                            aria-hidden
                          />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  ) : activeTab === "ingredients" &&
                    isIngredientGroups(activeContent) ? (
                    <div className="space-y-5">
                      {activeContent.map((item) => (
                        <div key={item.name}>
                          <h4 className="text-sm font-semibold text-dark-green sm:text-base">
                            {item.name}
                          </h4>
                          <p className="mt-1 text-sm leading-relaxed text-dark-green/80 sm:text-base">
                            {item.list}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-dark-green/80 sm:text-base">
                      {typeof activeContent === "string" ? activeContent : ""}
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </article>
      </div>
    </main>
  );
}
