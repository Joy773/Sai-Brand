"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LuCheck, LuShoppingCart } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { getKitProductTags, getSlugFromImage, KIT_SLUG } from "@/app/lib/products";
import ProductTags from "@/app/components/ProductTags";

const kitImages = [
  "/kit-1.png",
  "/kit-2.png",
  "/kit-3.png",
  "/kit-4.png",
];

const cardHover =
  "transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none";

const imageHover =
  "transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100";

const moreInfoButton =
  "inline-flex w-full items-center justify-center rounded-full border border-dark-green px-3 py-2 text-xs font-medium text-dark-green transition-all duration-300 hover:bg-dark-green/5 motion-reduce:transition-none sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm";

const addToCartButton =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-dark-green px-3 py-2 text-xs font-medium text-warm-white transition-all duration-300 hover:scale-[1.02] hover:bg-dark-green/90 motion-reduce:hover:scale-100 sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm";

const productMoreInfoButton =
  "inline-flex w-fit shrink-0 items-center justify-center rounded-full border border-dark-green px-3 py-1.5 text-[11px] font-medium text-dark-green transition-all duration-300 hover:bg-dark-green/5 motion-reduce:transition-none sm:px-4 sm:py-2 sm:text-xs";

const productAddToCartButton =
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full bg-dark-green px-3 py-1.5 text-[11px] font-medium text-warm-white transition-all duration-300 hover:bg-dark-green/90 motion-reduce:transition-none sm:gap-1.5 sm:px-4 sm:py-2 sm:text-xs";

export default function Products() {
  const [activeKitImage, setActiveKitImage] = useState(0);
  const {
    eyebrow,
    title,
    description,
    addToCartShort,
    addToCart,
    moreInfo,
    kit,
    items: products,
  } = useMessages().products;
  const kitTags = getKitProductTags(products);

  return (
    <section id="products" className="bg-beige/30 px-6 py-16 lg:px-8 lg:py-24">
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

        <article
          className={`group mb-4 flex flex-col overflow-hidden rounded-2xl bg-warm-white sm:mb-6 sm:rounded-3xl lg:flex-row ${cardHover} hover:shadow-dark-green/10`}
        >
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden lg:w-1/2">
            {kitImages.map((image, index) => (
              <Image
                key={image}
                src={image}
                alt={kit.imageAlt.replace("{index}", String(index + 1))}
                fill
                className={`object-contain object-center ${imageHover} transition-opacity duration-500 ease-in-out motion-reduce:transition-none ${
                  activeKitImage === index
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized
                aria-hidden={activeKitImage !== index}
              />
            ))}

            <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2 sm:bottom-4">
              {kitImages.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveKitImage(index)}
                  aria-label={kit.showImageLabel.replace(
                    "{index}",
                    String(index + 1),
                  )}
                  aria-current={activeKitImage === index ? "true" : undefined}
                  className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 sm:h-3 sm:w-3 ${
                    activeKitImage === index
                      ? "bg-dark-green"
                      : "bg-dark-green/30 hover:bg-dark-green/50"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-6 p-4 sm:p-6 lg:p-8">
            <Link href={`/${KIT_SLUG}`} className="group/link block">
              <h3 className="text-xl font-semibold text-dark-green transition-colors group-hover/link:text-dark-green/80 sm:text-2xl lg:text-3xl">
                {kit.name}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-dark-green/70 sm:text-base lg:text-lg">
                {kit.description}
              </p>
            </Link>

            <ProductTags tags={kitTags} />

              <ul className="mt-4 space-y-2 sm:mt-6">
                {kit.includes.map((item) => (
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-lg font-bold text-dark-green sm:text-xl lg:text-2xl">
                {kit.price}
              </p>

              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Link href={`/${KIT_SLUG}`} className={moreInfoButton}>
                  {moreInfo}
                </Link>
                <button type="button" className={addToCartButton}>
                  <LuShoppingCart className="h-4 w-4" aria-hidden />
                  <span className="sm:hidden">{addToCartShort}</span>
                  <span className="hidden sm:inline">{addToCart}</span>
                </button>
              </div>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {products.map((product) => {
            const slug = getSlugFromImage(product.image);
            if (!slug) return null;

            return (
            <article
              key={product.image}
              className={`group flex flex-col overflow-hidden rounded-2xl bg-warm-white sm:flex-row sm:items-stretch sm:rounded-3xl ${cardHover} hover:shadow-dark-green/10`}
            >
              <Link
                href={`/${slug}`}
                className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-beige/40 p-3 sm:w-36 sm:max-w-[38%] sm:p-4 lg:w-44 lg:max-w-[11rem]"
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className={`object-contain object-center ${imageHover}`}
                  sizes="(max-width: 1024px) 50vw, 224px"
                  unoptimized
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-3 sm:gap-4 sm:p-4 lg:p-6">
                <div className="min-w-0">
                  <Link href={`/${slug}`}>
                    <h3 className="line-clamp-2 text-sm font-semibold text-dark-green transition-colors hover:text-dark-green/80 sm:text-base lg:text-xl">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dark-green/70 sm:mt-2 sm:text-sm">
                    {product.description}
                  </p>
                  {"tags" in product ? <ProductTags tags={product.tags} /> : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                  <p className="text-sm font-bold text-dark-green sm:text-base lg:text-lg">
                    {product.price}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/${slug}`} className={productMoreInfoButton}>
                      {moreInfo}
                    </Link>
                    <button type="button" className={productAddToCartButton}>
                      <LuShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                      <span className="sm:hidden">{addToCartShort}</span>
                      <span className="hidden sm:inline">{addToCart}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
