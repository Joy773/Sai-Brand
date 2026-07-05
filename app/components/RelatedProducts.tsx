"use client";

import Image from "next/image";
import Link from "next/link";
import { LuCheck, LuShoppingCart } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";
import {
  getSlugFromImage,
  KIT_SLUG,
  type CatalogSlug,
} from "@/app/lib/products";

const cardHover =
  "transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none";

const imageHover =
  "transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100";

type RelatedProductsProps = {
  slug: CatalogSlug;
};

export default function RelatedProducts({ slug }: RelatedProductsProps) {
  const { title, subtitle } = useMessages().relatedProducts;
  const { addToCartShort, addToCart, kit, items } = useMessages().products;

  const relatedProducts = items.filter((product) => {
    const productSlug = getSlugFromImage(product.image);
    return productSlug && productSlug !== slug;
  });

  const showKit = slug !== KIT_SLUG;

  if (!showKit && relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="bg-beige/30 px-6 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            {title}
          </p>
          <h2 className="mt-4 text-3xl font-bold text-dark-green sm:text-4xl lg:text-5xl">
            {subtitle}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {showKit ? (
            <Link
              href={`/${KIT_SLUG}`}
              className={`group col-span-2 flex flex-col overflow-hidden rounded-2xl bg-warm-white sm:rounded-3xl lg:flex-row ${cardHover} hover:shadow-dark-green/10`}
            >
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-beige/40 p-4 sm:p-6 lg:w-1/2">
                <Image
                  src="/kit-1.png"
                  alt={kit.name}
                  fill
                  className={`object-contain object-center ${imageHover}`}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized
                />
              </div>

              <div className="flex flex-1 flex-col justify-between gap-6 p-4 sm:p-6 lg:p-8">
                <div>
                  <h3 className="text-xl font-semibold text-dark-green sm:text-2xl lg:text-3xl">
                    {kit.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-dark-green/70 sm:text-base lg:text-lg">
                    {kit.description}
                  </p>
                </div>

                <ul className="space-y-2">
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

                  <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-dark-green px-3 py-2 text-xs font-medium text-warm-white transition-all duration-300 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100 sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm">
                    <LuShoppingCart
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      aria-hidden
                    />
                    <span className="sm:hidden">{addToCartShort}</span>
                    <span className="hidden sm:inline">{addToCart}</span>
                  </span>
                </div>
              </div>
            </Link>
          ) : null}

          {relatedProducts.map((product) => {
            const productSlug = getSlugFromImage(product.image);
            if (!productSlug) return null;

            return (
              <Link
                key={product.image}
                href={`/${productSlug}`}
                className={`group flex flex-col overflow-hidden rounded-2xl bg-warm-white sm:rounded-3xl lg:flex-row ${cardHover} hover:shadow-dark-green/10`}
              >
                <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-beige/40 p-3 sm:p-4 lg:w-56">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className={`object-contain object-center ${imageHover}`}
                    sizes="(max-width: 1024px) 50vw, 224px"
                    unoptimized
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between gap-3 p-3 sm:gap-4 sm:p-6 lg:p-8">
                  <div>
                    <h3 className="text-sm font-semibold text-dark-green sm:text-xl lg:text-2xl">
                      {product.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dark-green/70 sm:mt-2 sm:text-sm lg:text-base">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
                    <p className="text-sm font-bold text-dark-green sm:text-lg lg:text-xl">
                      {product.price}
                    </p>

                    <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-dark-green px-3 py-2 text-xs font-medium text-warm-white transition-all duration-300 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100 sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm">
                      <LuShoppingCart
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        aria-hidden
                      />
                      <span className="sm:hidden">{addToCartShort}</span>
                      <span className="hidden sm:inline">{addToCart}</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
