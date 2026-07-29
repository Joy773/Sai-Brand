"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LuArrowLeft,
  LuCheck,
  LuMinus,
  LuPlay,
  LuPlus,
  LuShoppingCart,
  LuX,
} from "react-icons/lu";
import { useLocale, useMessages } from "@/app/i18n/LocaleProvider";
import ProductPrice, {
  getEffectivePrice,
} from "@/app/components/ProductPrice";
import {
  buildProductMedia,
  getCartImageFromMedia,
  type ProductMediaItem,
} from "@/app/lib/productMedia";
import { showAddedToCartToast } from "@/app/lib/showAddedToCartToast";
import { useCartStore } from "@/app/store/cart-store";

const tabIds = [
  "keyBenefits",
  "howToUse",
  "ingredients",
  "safetyNotes",
] as const;

const MAX_VISIBLE_IMAGE_THUMBS = 5;

type TabId = (typeof tabIds)[number];

type StoreProductDetails = {
  keyBenefits: string[];
  howToUse: string;
  ingredients: string;
  safetyNotes: string;
};

type StoreProduct = {
  id: string;
  name: string;
  description: string;
  slug: string;
  productType: "single" | "kit";
  price: string;
  discountPrice?: string | null;
  size: string;
  image: string;
  images: string[];
  videos?: string[];
  status: "in_stock" | "low_stock";
  details: StoreProductDetails;
};

type ProductDetailProps = {
  slug: string;
};

type IndexedMedia = {
  item: ProductMediaItem;
  index: number;
};

function ProductMediaGallery({
  productId,
  productName,
  media,
  activeMedia,
  onSelect,
  videoLabel,
  fullViewLabel,
}: {
  productId: string;
  productName: string;
  media: ProductMediaItem[];
  activeMedia: number;
  onSelect: (index: number) => void;
  videoLabel: string;
  fullViewLabel: string;
}) {
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const activeItem = media[activeMedia] ?? media[0];

  const imageMedia = media
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "image") as IndexedMedia[];
  const videoMedia = media
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "video") as IndexedMedia[];

  const visibleImages = imageMedia.slice(0, MAX_VISIBLE_IMAGE_THUMBS);
  const overflowImageCount = Math.max(
    0,
    imageMedia.length - MAX_VISIBLE_IMAGE_THUMBS,
  );
  const firstOverflowIndex =
    overflowImageCount > 0
      ? imageMedia[MAX_VISIBLE_IMAGE_THUMBS]?.index
      : null;
  const isOverflowActive =
    firstOverflowIndex != null &&
    imageMedia
      .slice(MAX_VISIBLE_IMAGE_THUMBS)
      .some(({ index }) => index === activeMedia);
  const showSidebar = media.length > 1;

  useEffect(() => {
    if (!isFullViewOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullViewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullViewOpen]);

  const thumbClassName = (isActive: boolean) =>
    `relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-16 sm:w-16 ${
      isActive
        ? "border-dark-green"
        : "border-dark-green/15 hover:border-dark-green/40"
    }`;

  return (
    <>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start lg:w-1/2">
        {showSidebar ? (
          <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 sm:max-h-[34rem] sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:pb-0">
            {visibleImages.map(({ item, index }) => (
              <button
                key={`${productId}-thumb-image-${item.url}-${index}`}
                type="button"
                onClick={() => onSelect(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={activeMedia === index ? "true" : undefined}
                className={thumbClassName(activeMedia === index)}
              >
                <Image
                  src={item.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              </button>
            ))}

            {overflowImageCount > 0 && firstOverflowIndex != null ? (
              <button
                type="button"
                onClick={() => onSelect(firstOverflowIndex)}
                aria-label={`Show ${overflowImageCount} more images`}
                aria-current={isOverflowActive ? "true" : undefined}
                className={`${thumbClassName(isOverflowActive)} bg-beige/60`}
              >
                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-dark-green">
                  {overflowImageCount}+
                </span>
              </button>
            ) : null}

            {videoMedia.map(({ item, index }, videoOrder) => (
              <div
                key={`${productId}-thumb-video-${item.url}-${index}`}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-label={`Show video ${videoOrder + 1}`}
                  aria-current={activeMedia === index ? "true" : undefined}
                  className={`${thumbClassName(activeMedia === index)} bg-dark-green/85`}
                >
                  <span className="flex h-full w-full items-center justify-center text-warm-white">
                    <LuPlay className="h-5 w-5 fill-current" aria-hidden />
                  </span>
                </button>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-dark-green/50">
                  {videoLabel}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => setIsFullViewOpen(true)}
            aria-label={fullViewLabel}
            className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F3E8DF] text-left sm:rounded-3xl lg:aspect-auto lg:h-[34rem] lg:rounded-l-3xl"
          >
            {media.map((item, index) =>
              item.type === "video" ? (
                <video
                  key={`${productId}-video-${item.url}-${index}`}
                  src={item.url}
                  className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
                    activeMedia === index
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                  playsInline
                  muted
                  loop
                  autoPlay={activeMedia === index}
                  aria-hidden={activeMedia !== index}
                />
              ) : (
                <Image
                  key={`${productId}-image-${item.url}-${index}`}
                  src={item.url}
                  alt={productName}
                  fill
                  className={`object-contain object-center transition-opacity duration-500 ${
                    activeMedia === index
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={index === 0}
                  unoptimized
                  aria-hidden={activeMedia !== index}
                />
              ),
            )}
          </button>
          <p className="mt-2 text-center text-sm text-dark-green/60">
            {fullViewLabel}
          </p>
        </div>
      </div>

      {isFullViewOpen && activeItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-dark-green/70"
            aria-label="Close full view"
            onClick={() => setIsFullViewOpen(false)}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col items-center">
            <button
              type="button"
              onClick={() => setIsFullViewOpen(false)}
              className="absolute -top-2 right-0 z-20 rounded-full bg-warm-white p-2 text-dark-green shadow-md transition-colors hover:bg-beige sm:-right-2"
              aria-label="Close full view"
            >
              <LuX className="h-5 w-5" aria-hidden />
            </button>
            <div className="relative h-[70vh] w-full overflow-hidden rounded-2xl bg-[#F3E8DF]">
              {activeItem.type === "video" ? (
                <video
                  src={activeItem.url}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                  autoPlay
                />
              ) : (
                <Image
                  src={activeItem.url}
                  alt={productName}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  unoptimized
                  priority
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function ProductDetail({ slug }: ProductDetailProps) {
  const { locale } = useLocale();
  const { productPage, products: productMessages } = useMessages();
  const { addedToCart } = useMessages().cart;
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("keyBenefits");
  const [activeMedia, setActiveMedia] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/products?slug=${encodeURIComponent(slug)}&locale=${locale}`,
        );
        const data = (await response.json()) as {
          ok?: boolean;
          product?: StoreProduct;
          error?: string;
        };

        if (!response.ok || !data.ok || !data.product) {
          throw new Error(data.error ?? "Product not found.");
        }

        if (!cancelled) {
          setProduct(data.product);
          setActiveMedia(0);
          setQuantity(1);
          setActiveTab("keyBenefits");
        }
      } catch (loadFailure) {
        if (!cancelled) {
          setProduct(null);
          setError(
            loadFailure instanceof Error
              ? loadFailure.message
              : "Failed to load product.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug, locale]);

  const decreaseQuantity = () =>
    setQuantity((current) => Math.max(1, current - 1));
  const increaseQuantity = () => setQuantity((current) => current + 1);

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    const media = buildProductMedia(
      product.images.length > 0 ? product.images : [product.image],
      product.videos ?? [],
    );

    addItem({
      slug: product.slug,
      name: product.name,
      price: getEffectivePrice(product.price, product.discountPrice),
      image: getCartImageFromMedia(media, activeMedia, product.image),
      quantity,
    });
    showAddedToCartToast(addedToCart);
  };

  if (isLoading) {
    return (
      <main className="flex-1 px-6 py-10 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-dark-green/70">Loading product...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
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
          <p className="mt-8 text-base text-red-700">
            {error ?? "Product not found."}
          </p>
        </div>
      </main>
    );
  }

  const media = buildProductMedia(
    product.images.length > 0 ? product.images : [product.image || "/hero-img.png"],
    product.videos ?? [],
  );
  const activeContent =
    activeTab === "keyBenefits"
      ? product.details.keyBenefits
      : product.details[activeTab];

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
          <ProductMediaGallery
            productId={product.id}
            productName={product.name}
            media={media}
            activeMedia={activeMedia}
            onSelect={setActiveMedia}
            videoLabel={productPage.videoLabel}
            fullViewLabel={productPage.fullViewLabel}
          />

          <div className="flex flex-1 flex-col p-6 sm:p-8 lg:p-10">
            <h1 className="text-2xl font-bold text-dark-green sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-dark-green/70 sm:text-lg">
              {product.description}
            </p>

            {product.size ? (
              <p className="mt-6 text-sm text-dark-green sm:text-base">
                {productPage.size}: {product.size}
              </p>
            ) : null}

            <p
              className={`mt-3 text-sm font-semibold ${
                product.status === "low_stock"
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {product.status === "low_stock"
                ? productMessages.lowStock
                : productMessages.inStock}
            </p>

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
                  <ProductPrice
                    price={product.price}
                    discountPrice={product.discountPrice}
                    className="mt-1 text-base font-semibold text-dark-green"
                    originalClassName="ml-2 font-medium text-dark-green/45 line-through"
                  />
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
                  onClick={handleAddToCart}
                  className="inline-flex w-fit min-w-0 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-dark-green px-5 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-dark-green/90 sm:w-auto sm:self-auto sm:px-6"
                >
                  <LuShoppingCart className="h-4 w-4" aria-hidden />
                  {productPage.addToCart}
                </button>
              </div>
            </div>

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
              {activeTab === "keyBenefits" &&
              Array.isArray(activeContent) ? (
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
              ) : (
                <p className="whitespace-pre-line text-sm leading-relaxed text-dark-green/80 sm:text-base">
                  {typeof activeContent === "string" ? activeContent : ""}
                </p>
              )}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
