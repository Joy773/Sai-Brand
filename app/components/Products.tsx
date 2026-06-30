"use client";

import Image from "next/image";
import { LuShoppingCart } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";

const cardHover =
  "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none";

export default function Products() {
  const {
    eyebrow,
    title,
    description,
    addToCartShort,
    addToCart,
    items: products,
  } = useMessages().products;

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

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {products.map((product) => (
            <article
              key={product.image}
              className={`group flex flex-col overflow-hidden rounded-2xl border border-beige bg-warm-white sm:rounded-3xl lg:flex-row ${cardHover} hover:border-dark-green/20`}
            >
              <div className="relative aspect-square w-full shrink-0 bg-beige/40 lg:w-56">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 1024px) 50vw, 224px"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between gap-3 p-3 sm:gap-4 sm:p-6 lg:p-8">
                <div>
                  <h3 className="text-sm font-semibold text-dark-green sm:text-xl lg:text-2xl">
                    {product.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dark-green/70 sm:mt-2 sm:line-clamp-none sm:text-sm lg:text-base">
                    {product.description}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm font-bold text-dark-green sm:text-lg lg:text-xl">
                    {product.price}
                  </p>

                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-dark-green px-3 py-2 text-xs font-medium text-warm-white transition-colors hover:bg-dark-green/90 sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    <LuShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    <span className="sm:hidden">{addToCartShort}</span>
                    <span className="hidden sm:inline">{addToCart}</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
