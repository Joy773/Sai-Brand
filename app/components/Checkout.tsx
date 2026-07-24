"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { LuArrowLeft } from "react-icons/lu";
import { toast } from "sonner";
import SignInModal from "@/app/components/SignInModal";
import SignupModal from "@/app/components/SignupModal";
import ForgotPasswordModal from "@/app/components/ForgotPasswordModal";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { formatPrice, parsePrice } from "@/app/lib/price";
import { selectCartItemCount, useCartStore } from "@/app/store/cart-store";

export const CHECKOUT_ADDRESS_KEY = "sai-checkout-address";

type CheckoutDraft = {
  firstName: string;
  lastName: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
  address: string;
  price: number;
  shippingFee: number;
  total: number;
};

function parseCheckoutDraft(raw: string | null): CheckoutDraft | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft>;

    if (
      typeof parsed.firstName !== "string" ||
      typeof parsed.lastName !== "string" ||
      typeof parsed.streetAddress !== "string" ||
      typeof parsed.country !== "string" ||
      typeof parsed.city !== "string" ||
      typeof parsed.zipPostalCode !== "string" ||
      typeof parsed.phoneNumber !== "string" ||
      typeof parsed.address !== "string" ||
      !parsed.firstName.trim() ||
      !parsed.lastName.trim() ||
      !parsed.streetAddress.trim() ||
      !parsed.country.trim() ||
      !parsed.city.trim() ||
      !parsed.zipPostalCode.trim() ||
      !parsed.phoneNumber.trim() ||
      !parsed.address.trim()
    ) {
      return null;
    }

    return {
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      streetAddress: parsed.streetAddress.trim(),
      country: parsed.country.trim(),
      stateProvince:
        typeof parsed.stateProvince === "string"
          ? parsed.stateProvince.trim()
          : "",
      city: parsed.city.trim(),
      zipPostalCode: parsed.zipPostalCode.trim(),
      phoneNumber: parsed.phoneNumber.trim(),
      address: parsed.address.trim(),
      price:
        typeof parsed.price === "number" && Number.isFinite(parsed.price)
          ? parsed.price
          : 0,
      shippingFee:
        typeof parsed.shippingFee === "number" &&
        Number.isFinite(parsed.shippingFee)
          ? parsed.shippingFee
          : 0,
      total:
        typeof parsed.total === "number" && Number.isFinite(parsed.total)
          ? parsed.total
          : 0,
    };
  } catch {
    return null;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const {
    title,
    empty,
    continueShopping,
    backToCart,
    orderSummary,
    deliveryAddress,
    paymentMethod,
    onlinePayment,
    price: priceLabel,
    shippingFee,
    free,
    totalAmount,
    payNow,
    redirecting,
    checkoutFailed,
    missingAddress,
    paymentSuccess,
    paymentCancelled,
  } = useMessages().checkout;

  const items = useCartStore((state) => state.items);
  const itemCount = useCartStore(selectCartItemCount);
  const clearCart = useCartStore((state) => state.clearCart);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");

    if (checkoutStatus === "success") {
      clearCart();
      sessionStorage.removeItem(CHECKOUT_ADDRESS_KEY);
      toast.success(paymentSuccess);
      router.replace("/cart");
      return;
    }

    if (checkoutStatus === "cancel") {
      toast.error(paymentCancelled);
      router.replace("/checkout");
      return;
    }

    const savedDraft = parseCheckoutDraft(
      sessionStorage.getItem(CHECKOUT_ADDRESS_KEY),
    );
    setDraft(savedDraft);

    if (!savedDraft) {
      toast.error(missingAddress);
      router.replace("/cart");
    }
  }, [
    clearCart,
    missingAddress,
    paymentCancelled,
    paymentSuccess,
    router,
    searchParams,
  ]);

  const referencePrice = items[0]?.price ?? "€0.00";
  const cartSubtotal = items.reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0,
  );
  const subtotal = draft?.price || cartSubtotal;
  const shippingFeeAmount = draft?.shippingFee ?? 0;
  const orderTotal = draft?.total || subtotal + shippingFeeAmount;

  const openSignIn = () => {
    setSignupOpen(false);
    setForgotPasswordOpen(false);
    setSignInOpen(true);
  };

  const openSignup = () => {
    setSignInOpen(false);
    setForgotPasswordOpen(false);
    setSignupOpen(true);
  };

  const openForgotPassword = () => {
    setSignInOpen(false);
    setSignupOpen(false);
    setForgotPasswordOpen(true);
  };

  useEffect(() => {
    if (status === "authenticated") {
      setSignInOpen(false);
      setSignupOpen(false);
      setForgotPasswordOpen(false);
    }
  }, [status]);

  const handlePayNow = async () => {
    if (status !== "authenticated") {
      setSignInOpen(true);
      return;
    }

    if (items.length === 0) {
      return;
    }

    if (!draft) {
      toast.error(missingAddress);
      router.replace("/cart");
      return;
    }

    setIsStartingCheckout(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: draft.firstName,
          lastName: draft.lastName,
          streetAddress: draft.streetAddress,
          country: draft.country,
          stateProvince: draft.stateProvince,
          city: draft.city,
          zipPostalCode: draft.zipPostalCode,
          phoneNumber: draft.phoneNumber,
          address: draft.address,
          price: subtotal,
          shippingFee: shippingFeeAmount,
          total: orderTotal,
          products: items.map((item) => ({
            slug: item.slug,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
          })),
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.error ?? checkoutFailed);
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : checkoutFailed,
      );
      setIsStartingCheckout(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="flex-1 bg-warm-white px-6 py-10 lg:px-8 lg:py-14">
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
      </main>
    );
  }

  return (
    <>
      <main className="flex-1 bg-warm-white px-6 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
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

              <ul className="mt-6 divide-y divide-beige/70 rounded-xl border border-beige bg-beige/20">
                {items.map((item) => {
                  const itemTotal = parsePrice(item.price) * item.quantity;

                  return (
                    <li
                      key={item.slug}
                      className="flex gap-4 p-4 sm:items-center sm:p-5"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-beige bg-warm-white sm:h-24 sm:w-24">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover object-center"
                          sizes="96px"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-dark-green sm:text-lg">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-dark-green/60">
                          {item.quantity} × {item.price}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-dark-green sm:text-base">
                          {formatPrice(itemTotal, item.price)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Link
                href="/cart"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-dark-green transition-colors hover:text-gold"
              >
                <LuArrowLeft className="h-4 w-4" aria-hidden />
                {backToCart}
              </Link>
            </section>

            <aside className="h-fit rounded-xl border border-beige bg-beige/40 p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-dark-green">{orderSummary}</h2>

              <div className="mt-5 border-b border-beige/70 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-green/50">
                  {deliveryAddress}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-dark-green/80">
                  {draft?.address}
                </p>
              </div>

              <div className="mt-5 border-b border-beige/70 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-green/50">
                  {paymentMethod}
                </p>
                <p className="mt-2 text-sm font-medium text-dark-green">
                  {onlinePayment}
                </p>
              </div>

              <div className="mt-5 space-y-3 text-sm text-dark-green/80">
                <div className="flex items-center justify-between">
                  <span>{priceLabel}</span>
                  <span>{formatPrice(subtotal, referencePrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{shippingFee}</span>
                  <span className="font-medium text-dark-green">
                    {shippingFeeAmount === 0
                      ? free
                      : formatPrice(shippingFeeAmount, referencePrice)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-beige/70 pt-5">
                <span className="text-base font-bold text-dark-green">
                  {totalAmount}
                </span>
                <span className="text-lg font-bold text-dark-green">
                  {formatPrice(orderTotal, referencePrice)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void handlePayNow()}
                disabled={isStartingCheckout || !draft}
                className="mt-6 w-full rounded-md bg-dark-green px-4 py-3.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStartingCheckout ? redirecting : payNow}
              </button>
            </aside>
          </div>
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
        onOpenForgotPassword={openForgotPassword}
        onSuccess={() => setSignInOpen(false)}
      />
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        onOpenSignIn={openSignIn}
      />
    </>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<main className="flex-1 bg-warm-white" aria-hidden />}>
      <CheckoutContent />
    </Suspense>
  );
}
