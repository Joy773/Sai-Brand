"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Suspense, useState } from "react";
import { LuArrowLeft, LuX } from "react-icons/lu";
import { toast } from "sonner";
import SignInModal from "@/app/components/SignInModal";
import SignupModal from "@/app/components/SignupModal";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { formatPrice, parsePrice } from "@/app/lib/price";
import {
  showRemovedFromCartToast,
} from "@/app/lib/showAddedToCartToast";
import { selectCartItemCount, useCartStore } from "@/app/store/cart-store";

const MAX_QUANTITY = 20;

type PaymentType = "cod" | "online";

function CartContent() {
  const {
    title,
    empty,
    continueShopping,
    productDetails,
    subtotal: subtotalLabel,
    action,
    weight,
    weightNA,
    qty,
    orderSummary,
    deliveryAddress,
    addressPlaceholder,
    paymentMethod,
    cashOnDelivery,
    onlinePayment,
    price: priceLabel,
    shippingFee,
    free,
    totalAmount,
    placeOrder,
    orderPlaced,
    completeDeliveryAddress,
    orderFailed,
    remove,
    removedFromCart,
  } = useMessages().cart;

  const { status } = useSession();
  const items = useCartStore((state) => state.items);
  const itemCount = useCartStore(selectCartItemCount);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const [address, setAddress] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("cod");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  const referencePrice = items[0]?.price ?? "€0.00";
  const subtotal = items.reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0,
  );

  const quantityOptions = Array.from({ length: MAX_QUANTITY }, (_, index) => index + 1);

  const handleRemoveItem = (slug: (typeof items)[number]["slug"]) => {
    removeItem(slug);
    showRemovedFromCartToast(removedFromCart);
  };

  const openSignIn = () => {
    setSignupOpen(false);
    setSignInOpen(true);
  };

  const openSignup = () => {
    setSignInOpen(false);
    setSignupOpen(true);
  };

  const handlePlaceOrder = async () => {
    if (status !== "authenticated") {
      setSignInOpen(true);
      return;
    }

    if (address.trim().length === 0) {
      setAddressError(completeDeliveryAddress);
      return;
    }

    setAddressError(null);

    if (paymentType !== "cod" || isPlacingOrder || items.length === 0) {
      return;
    }

    setIsPlacingOrder(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: address.trim(),
          products: items.map((item) => ({
            slug: item.slug,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
          })),
          total: subtotal,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? orderFailed);
      }

      clearCart();
      toast.success(orderPlaced);
    } catch (placeOrderError) {
      toast.error(
        placeOrderError instanceof Error
          ? placeOrderError.message
          : orderFailed,
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <>
      <main className="flex-1 bg-warm-white px-6 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          {items.length === 0 ? (
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-3xl font-bold text-dark-green sm:text-4xl">
                {title}
              </h1>
              <div className="mt-10 rounded-2xl border border-beige bg-beige/40 p-8 sm:p-12">
                <p className="text-base text-dark-green/70 sm:text-lg">{empty}</p>
                <Link
                  href="/#products"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-dark-green transition-colors hover:text-gold"
                >
                  <LuArrowLeft className="h-4 w-4" aria-hidden />
                  {continueShopping}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section>
                <div className="flex items-baseline gap-2">
                  <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">
                    {title}
                  </h1>
                  <span className="text-base font-medium text-gold sm:text-lg">
                    ({itemCount})
                  </span>
                </div>

                <div className="mt-6 hidden border-b border-beige/80 pb-3 text-sm font-medium text-dark-green/50 sm:grid sm:grid-cols-[minmax(0,1fr)_120px_80px] sm:gap-4">
                  <span>{productDetails}</span>
                  <span className="text-center">{subtotalLabel}</span>
                  <span className="text-center">{action}</span>
                </div>

                <ul className="mt-4 divide-y divide-beige/70">
                  {items.map((item) => {
                    const itemTotal = parsePrice(item.price) * item.quantity;

                    return (
                      <li
                        key={item.slug}
                        className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_120px_80px] sm:items-center sm:gap-4"
                      >
                        <div className="flex gap-4">
                          <Link
                            href={`/${item.slug}`}
                            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-beige bg-beige/20 sm:h-24 sm:w-24"
                          >
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover object-center"
                              sizes="96px"
                              unoptimized
                            />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/${item.slug}`}
                              className="text-base font-semibold text-dark-green transition-colors hover:text-dark-green/80 sm:text-lg"
                            >
                              {item.name}
                            </Link>
                            <p className="mt-1 text-sm text-dark-green/50">
                              {weight}: {weightNA}
                            </p>
                            <label className="mt-2 inline-flex items-center gap-2 text-sm text-dark-green/70">
                              <span>{qty}:</span>
                              <select
                                value={item.quantity}
                                onChange={(event) =>
                                  updateQuantity(
                                    item.slug,
                                    Number(event.target.value),
                                  )
                                }
                                className="rounded-md border border-dark-green/25 bg-warm-white px-2 py-1 text-sm text-dark-green outline-none focus:border-dark-green focus:ring-1 focus:ring-dark-green/20"
                                aria-label={`${qty} ${item.name}`}
                              >
                                {quantityOptions.map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>

                        <p className="text-base font-semibold text-dark-green sm:text-center">
                          <span className="mr-2 text-sm font-normal text-dark-green/50 sm:hidden">
                            {subtotalLabel}:
                          </span>
                          {formatPrice(itemTotal, item.price)}
                        </p>

                        <div className="flex sm:justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.slug)}
                            aria-label={remove}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-dark-green text-warm-white transition-colors hover:bg-dark-green/90"
                          >
                            <LuX className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Link
                  href="/#products"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-dark-green transition-colors hover:text-gold"
                >
                  <LuArrowLeft className="h-4 w-4" aria-hidden />
                  {continueShopping}
                </Link>
              </section>

              <aside className="h-fit rounded-xl border border-beige bg-beige/40 p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-dark-green">{orderSummary}</h2>

                <div className="mt-5 border-b border-beige/70 pb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-green/50">
                    {deliveryAddress}
                  </p>
                  <label className="mt-2 block">
                    <span className="sr-only">{deliveryAddress}</span>
                    <textarea
                      value={address}
                      onChange={(event) => {
                        setAddress(event.target.value);
                        if (addressError) {
                          setAddressError(null);
                        }
                      }}
                      placeholder={addressPlaceholder}
                      rows={4}
                      className="w-full resize-none rounded-md border border-beige bg-warm-white px-3 py-2.5 text-sm leading-relaxed text-dark-green outline-none placeholder:text-dark-green/40 focus:border-dark-green"
                    />
                  </label>
                </div>

                <div className="mt-5 border-b border-beige/70 pb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-green/50">
                    {paymentMethod}
                  </p>
                  <select
                    value={paymentType}
                    onChange={(event) =>
                      setPaymentType(event.target.value as PaymentType)
                    }
                    className="mt-2 w-full rounded-md border border-beige bg-warm-white px-3 py-2.5 text-sm text-dark-green outline-none focus:border-dark-green"
                    aria-label={paymentMethod}
                  >
                    <option value="cod">{cashOnDelivery}</option>
                    <option value="online">{onlinePayment}</option>
                  </select>
                </div>

                <div className="mt-5 space-y-3 text-sm text-dark-green/80">
                  <div className="flex items-center justify-between">
                    <span>{priceLabel}</span>
                    <span>{formatPrice(subtotal, referencePrice)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{shippingFee}</span>
                    <span className="font-medium text-dark-green">{free}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-beige/70 pt-5">
                  <span className="text-base font-bold text-dark-green">
                    {totalAmount}
                  </span>
                  <span className="text-lg font-bold text-dark-green">
                    {formatPrice(subtotal, referencePrice)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void handlePlaceOrder()}
                  disabled={isPlacingOrder}
                  className="mt-6 w-full rounded-md bg-dark-green px-4 py-3.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placeOrder}
                </button>
                {addressError ? (
                  <p
                    role="alert"
                    className="mt-3 text-center text-sm font-medium text-red-600"
                  >
                    {addressError}
                  </p>
                ) : null}
              </aside>
            </div>
          )}
        </div>
      </main>

      <SignupModal
        isOpen={signupOpen}
        onClose={() => setSignupOpen(false)}
        onOpenSignIn={openSignIn}
      />
      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        onOpenSignup={openSignup}
        onSuccess={() => setSignInOpen(false)}
      />
    </>
  );
}

export default function Cart() {
  return (
    <Suspense fallback={<main className="flex-1 bg-warm-white" aria-hidden />}>
      <CartContent />
    </Suspense>
  );
}
