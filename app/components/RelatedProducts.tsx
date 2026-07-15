"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuShoppingCart } from "react-icons/lu";
import { useLocale, useMessages } from "@/app/i18n/LocaleProvider";
import ProductTags from "@/app/components/ProductTags";
import { showAddedToCartToast } from "@/app/lib/showAddedToCartToast";
import { useCartStore } from "@/app/store/cart-store";

const cardHover =
  "transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none";

const imageHover =
  "transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100";

const moreInfoButton =
  "inline-flex w-full items-center justify-center rounded-full border border-dark-green px-3 py-2 text-xs font-medium text-dark-green transition-all duration-300 hover:bg-dark-green/5 motion-reduce:transition-none sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm";

const addToCartButton =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-dark-green px-3 py-2 text-xs font-medium text-warm-white transition-all duration-300 hover:scale-[1.02] hover:bg-dark-green/90 motion-reduce:hover:scale-100 sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm";

type StoreProduct = {
  id: string;
  name: string;
  description: string;
  slug: string;
  productType: "single" | "kit";
  price: string;
  size: string;
  image: string;
  images: string[];
  status: "in_stock" | "low_stock";
};

function StockStatus({
  status,
  inStockLabel,
  lowStockLabel,
}: {
  status: "in_stock" | "low_stock";
  inStockLabel: string;
  lowStockLabel: string;
}) {
  const isLowStock = status === "low_stock";

  return (
    <p
      className={`mt-2 text-[11px] font-semibold sm:mt-3 sm:text-xs ${
        isLowStock ? "text-amber-700" : "text-emerald-700"
      }`}
    >
      {isLowStock ? lowStockLabel : inStockLabel}
    </p>
  );
}

type RelatedProductsProps = {
  slug: string;
};

export default function RelatedProducts({ slug }: RelatedProductsProps) {
  const { locale } = useLocale();
  const { title, subtitle } = useMessages().relatedProducts;
  const { addToCartShort, addToCart, moreInfo, loading, loadError, inStock, lowStock, kit } =
    useMessages().products;
  const { addedToCart } = useMessages().cart;
  const addItem = useCartStore((state) => state.addItem);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/products?locale=${locale}`);
        const data = (await response.json()) as {
          ok?: boolean;
          products?: StoreProduct[];
          error?: string;
        };

        if (!response.ok || !data.ok || !data.products) {
          throw new Error(data.error ?? loadError);
        }

        if (!cancelled) {
          setProducts(
            data.products.filter((product) => product.slug !== slug),
          );
        }
      } catch (loadFailure) {
        if (!cancelled) {
          setProducts([]);
          setError(
            loadFailure instanceof Error ? loadFailure.message : loadError,
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [locale, slug, loadError]);

  const handleAddToCart = (product: StoreProduct) => {
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    showAddedToCartToast(addedToCart);
  };

  if (isLoading) {
    return (
      <section className="bg-beige/30 px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-base text-dark-green/70">{loading}</p>
        </div>
      </section>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  const kits = products.filter((product) => product.productType === "kit");
  const singles = products.filter((product) => product.productType !== "kit");

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
          {kits.map((product) => (
            <article
              key={product.id}
              className={`group col-span-2 flex flex-col overflow-hidden rounded-2xl bg-warm-white sm:rounded-3xl lg:flex-row ${cardHover} hover:shadow-dark-green/10`}
            >
              <Link
                href={`/${product.slug}`}
                className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-beige/40 p-4 sm:p-6 lg:w-1/2"
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className={`object-contain object-center ${imageHover}`}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized
                />
              </Link>

              <div className="flex flex-1 flex-col justify-between gap-6 p-4 sm:p-6 lg:p-8">
                <div>
                  <Link href={`/${product.slug}`}>
                    <h3 className="text-xl font-semibold text-dark-green transition-colors hover:text-dark-green/80 sm:text-2xl lg:text-3xl">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="mt-2 text-sm leading-relaxed text-dark-green/70 sm:text-base lg:text-lg">
                    {product.description}
                  </p>
                  {product.size ? (
                    <p className="mt-3 text-sm font-bold text-dark-green sm:text-base">
                      {product.size}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm font-bold text-dark-green sm:text-base">
                    {kit.whatsIncluded}
                  </p>
                  <ProductTags tags={kit.includes} />
                </div>

                <div className="space-y-6">
                  <StockStatus
                    status={product.status ?? "in_stock"}
                    inStockLabel={inStock}
                    lowStockLabel={lowStock}
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <p className="text-lg font-bold text-dark-green sm:text-xl lg:text-2xl">
                      {product.price}
                    </p>

                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <Link href={`/${product.slug}`} className={moreInfoButton}>
                        {moreInfo}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className={addToCartButton}
                      >
                        <LuShoppingCart
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          aria-hidden
                        />
                        <span className="sm:hidden">{addToCartShort}</span>
                        <span className="hidden sm:inline">{addToCart}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {singles.map((product) => (
            <article
              key={product.id}
              className={`group flex flex-col overflow-hidden rounded-2xl bg-warm-white sm:rounded-3xl lg:flex-row ${cardHover} hover:shadow-dark-green/10`}
            >
              <Link
                href={`/${product.slug}`}
                className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-beige/40 p-3 sm:p-4 lg:w-56"
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

              <div className="flex flex-1 flex-col justify-between gap-3 p-3 sm:gap-4 sm:p-6 lg:p-8">
                <div>
                  <Link href={`/${product.slug}`}>
                    <h3 className="text-sm font-semibold text-dark-green transition-colors hover:text-dark-green/80 sm:text-xl lg:text-2xl">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dark-green/70 sm:mt-2 sm:text-sm lg:text-base">
                    {product.description}
                  </p>
                  {product.size ? <ProductTags tags={[product.size]} /> : null}
                  <StockStatus
                    status={product.status ?? "in_stock"}
                    inStockLabel={inStock}
                    lowStockLabel={lowStock}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm font-bold text-dark-green sm:text-lg lg:text-xl">
                    {product.price}
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <Link href={`/${product.slug}`} className={moreInfoButton}>
                      {moreInfo}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className={addToCartButton}
                    >
                      <LuShoppingCart
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        aria-hidden
                      />
                      <span className="sm:hidden">{addToCartShort}</span>
                      <span className="hidden sm:inline">{addToCart}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
