"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { LuArrowLeft, LuX } from "react-icons/lu";
import { toast } from "sonner";
import { CHECKOUT_ADDRESS_KEY } from "@/app/components/Checkout";
import PayPalCheckoutButtons from "@/app/components/PayPalCheckoutButtons";
import SignInModal from "@/app/components/SignInModal";
import SignupModal from "@/app/components/SignupModal";
import ForgotPasswordModal from "@/app/components/ForgotPasswordModal";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { formatPrice, parsePrice } from "@/app/lib/price";
import { showRemovedFromCartToast } from "@/app/lib/showAddedToCartToast";
import { selectCartItemCount, useCartStore } from "@/app/store/cart-store";

const MAX_QUANTITY = 20;

type PaymentType = "online" | "paypal";

type ShippingCountry = {
  id: string;
  country: string;
  price: number;
};

type AddressForm = {
  firstName: string;
  lastName: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
};

type AddressField = keyof AddressForm;

const initialAddressForm: AddressForm = {
  firstName: "",
  lastName: "",
  streetAddress: "",
  country: "",
  stateProvince: "",
  city: "",
  zipPostalCode: "",
  phoneNumber: "",
};

const requiredAddressFields: AddressField[] = [
  "firstName",
  "lastName",
  "streetAddress",
  "country",
  "city",
  "zipPostalCode",
  "phoneNumber",
];

const inputClassName =
  "w-full rounded-md border bg-warm-white px-3 py-2 text-sm text-dark-green outline-none placeholder:text-dark-green/35 focus:border-dark-green";

function formatDeliveryAddress(
  form: AddressForm,
  countryLabel: string,
): string {
  return [
    `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    form.streetAddress.trim(),
    [form.zipPostalCode.trim(), form.city.trim()].filter(Boolean).join(" "),
    form.stateProvince.trim(),
    countryLabel,
    form.phoneNumber.trim() ? `Phone: ${form.phoneNumber.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function CartContent() {
  const router = useRouter();
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
    firstName,
    lastName,
    streetAddress,
    change,
    save: saveAddressLabel,
    addressSaved,
    addressSaveFailed,
    country,
    stateProvince,
    city,
    zipPostalCode,
    phoneNumber,
    requiredField,
    paymentMethod,
    onlinePayment,
    onlinePaymentPaypal,
    price: priceLabel,
    shippingFee,
    free,
    totalAmount,
    continueToPayment,
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
  const [addressForm, setAddressForm] =
    useState<AddressForm>(initialAddressForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AddressField, string>>
  >({});
  const [paymentType, setPaymentType] = useState<PaymentType>("online");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [shippingCountries, setShippingCountries] = useState<ShippingCountry[]>(
    [],
  );
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const isAddressLocked = hasSavedAddress && !isEditingAddress;

  const referencePrice = items[0]?.price ?? "€0.00";
  const subtotal = items.reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0,
  );

  const quantityOptions = Array.from(
    { length: MAX_QUANTITY },
    (_, index) => index + 1,
  );

  const selectedShippingCountry = shippingCountries.find(
    (rate) => rate.country === addressForm.country,
  );
  const shippingFeeAmount = selectedShippingCountry?.price ?? 0;
  const orderTotal = subtotal + shippingFeeAmount;

  useEffect(() => {
    let cancelled = false;

    const loadShippingCountries = async () => {
      setIsLoadingCountries(true);

      try {
        const response = await fetch("/api/shipping");
        const data = (await response.json()) as {
          ok?: boolean;
          rates?: ShippingCountry[];
          error?: string;
        };

        if (!response.ok || !data.ok || !data.rates) {
          throw new Error(data.error ?? "Failed to load shipping countries.");
        }

        if (cancelled) {
          return;
        }

        setShippingCountries(data.rates);
        setAddressForm((prev) => {
          if (
            prev.country &&
            data.rates!.some((rate) => rate.country === prev.country)
          ) {
            return prev;
          }

          if (prev.country) {
            return prev;
          }

          return {
            ...prev,
            country: data.rates![0]?.country ?? "",
          };
        });
      } catch {
        if (!cancelled) {
          setShippingCountries([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCountries(false);
        }
      }
    };

    void loadShippingCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const loadSavedAddress = async () => {
      setIsLoadingAddress(true);

      try {
        const response = await fetch("/api/user/address");
        const data = (await response.json()) as {
          ok?: boolean;
          address?: AddressForm | null;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.ok || !data.address) {
          setHasSavedAddress(false);
          setIsEditingAddress(true);
          return;
        }

        const saved = data.address;
        const hasContent = Boolean(
          saved.streetAddress?.trim() ||
            saved.city?.trim() ||
            saved.phoneNumber?.trim() ||
            saved.firstName?.trim(),
        );

        if (!hasContent) {
          setHasSavedAddress(false);
          setIsEditingAddress(true);
          return;
        }

        setAddressForm({
          firstName: saved.firstName ?? "",
          lastName: saved.lastName ?? "",
          streetAddress: saved.streetAddress ?? "",
          country: saved.country ?? "",
          stateProvince: saved.stateProvince ?? "",
          city: saved.city ?? "",
          zipPostalCode: saved.zipPostalCode ?? "",
          phoneNumber: saved.phoneNumber ?? "",
        });
        setHasSavedAddress(true);
        setIsEditingAddress(false);
      } catch {
        if (!cancelled) {
          setHasSavedAddress(false);
          setIsEditingAddress(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAddress(false);
        }
      }
    };

    void loadSavedAddress();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const selectedCountryLabel = addressForm.country;

  const updateAddressField = (field: AddressField, value: string) => {
    if (isAddressLocked) {
      return;
    }

    setAddressForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (addressError) {
      setAddressError(null);
    }
  };

  const validateAddressForm = () => {
    const nextErrors: Partial<Record<AddressField, string>> = {};

    for (const field of requiredAddressFields) {
      if (!addressForm[field].trim()) {
        nextErrors[field] = requiredField;
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (status !== "authenticated") {
      setSignInOpen(true);
      return;
    }

    if (!validateAddressForm()) {
      setAddressError(completeDeliveryAddress);
      return;
    }

    if (isSavingAddress) {
      return;
    }

    setIsSavingAddress(true);
    setAddressError(null);

    try {
      const response = await fetch("/api/user/address", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: addressForm.firstName.trim(),
          lastName: addressForm.lastName.trim(),
          streetAddress: addressForm.streetAddress.trim(),
          country: addressForm.country.trim(),
          stateProvince: addressForm.stateProvince.trim(),
          city: addressForm.city.trim(),
          zipPostalCode: addressForm.zipPostalCode.trim(),
          phoneNumber: addressForm.phoneNumber.trim(),
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? addressSaveFailed);
      }

      setHasSavedAddress(true);
      setIsEditingAddress(false);
      toast.success(addressSaved);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : addressSaveFailed,
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleAddressAction = () => {
    if (isAddressLocked) {
      setIsEditingAddress(true);
      return;
    }

    void handleSaveAddress();
  };

  const handleRemoveItem = (slug: (typeof items)[number]["slug"]) => {
    removeItem(slug);
    showRemovedFromCartToast(removedFromCart);
  };

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

  const handlePlaceOrder = async () => {
    if (status !== "authenticated") {
      setSignInOpen(true);
      return;
    }

    if (!validateAddressForm()) {
      setAddressError(completeDeliveryAddress);
      return;
    }

    if (!selectedShippingCountry) {
      setAddressError(completeDeliveryAddress);
      return;
    }

    setAddressError(null);

    if (items.length === 0) {
      return;
    }

    // Stripe only prepares a checkout draft. The order is saved after payment.
    if (paymentType !== "online") {
      return;
    }

    const formattedAddress = formatDeliveryAddress(
      addressForm,
      selectedCountryLabel,
    );

    sessionStorage.setItem(
      CHECKOUT_ADDRESS_KEY,
      JSON.stringify({
        firstName: addressForm.firstName.trim(),
        lastName: addressForm.lastName.trim(),
        streetAddress: addressForm.streetAddress.trim(),
        country: selectedCountryLabel,
        stateProvince: addressForm.stateProvince.trim(),
        city: addressForm.city.trim(),
        zipPostalCode: addressForm.zipPostalCode.trim(),
        phoneNumber: addressForm.phoneNumber.trim(),
        address: formattedAddress,
        price: subtotal,
        shippingFee: shippingFeeAmount,
        total: orderTotal,
      }),
    );
    router.push("/checkout");
  };

  const fieldClassName = (field: AddressField) =>
    `${inputClassName} ${
      fieldErrors[field] ? "border-red-500" : "border-beige"
    } ${
      isAddressLocked
        ? "cursor-default bg-beige/40 text-dark-green/80"
        : ""
    }`;

  const addressInputProps = {
    readOnly: isAddressLocked,
    disabled: isAddressLocked || isLoadingAddress,
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
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_400px]">
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
                            <LuX
                              className="h-4 w-4"
                              strokeWidth={2.5}
                              aria-hidden
                            />
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
                <h2 className="text-lg font-bold text-dark-green">
                  {orderSummary}
                </h2>

                <div className="mt-5 border-b border-beige/70 pb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-green/50">
                    {deliveryAddress}
                  </p>

                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm text-dark-green">
                          {firstName}{" "}
                          <span className="text-red-600" aria-hidden>
                            *
                          </span>
                        </span>
                        <input
                          type="text"
                          value={addressForm.firstName}
                          onChange={(event) =>
                            updateAddressField("firstName", event.target.value)
                          }
                          className={fieldClassName("firstName")}
                          autoComplete="given-name"
                          {...addressInputProps}
                        />
                        {fieldErrors.firstName ? (
                          <span className="mt-1 block text-xs text-dark-green/80">
                            {fieldErrors.firstName}
                          </span>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm text-dark-green">
                          {lastName}{" "}
                          <span className="text-red-600" aria-hidden>
                            *
                          </span>
                        </span>
                        <input
                          type="text"
                          value={addressForm.lastName}
                          onChange={(event) =>
                            updateAddressField("lastName", event.target.value)
                          }
                          className={fieldClassName("lastName")}
                          autoComplete="family-name"
                          {...addressInputProps}
                        />
                        {fieldErrors.lastName ? (
                          <span className="mt-1 block text-xs text-dark-green/80">
                            {fieldErrors.lastName}
                          </span>
                        ) : null}
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-1 flex items-center justify-between gap-2 text-sm text-dark-green">
                        <span>
                          {streetAddress}{" "}
                          <span className="text-red-600" aria-hidden>
                            *
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={handleAddressAction}
                          disabled={isSavingAddress || isLoadingAddress}
                          className={`cursor-pointer text-sm font-medium text-dark-green disabled:cursor-not-allowed disabled:opacity-60 ${
                            !hasSavedAddress && !isEditingAddress
                              ? "invisible pointer-events-none"
                              : ""
                          }`}
                        >
                          {isAddressLocked ? change : saveAddressLabel}
                        </button>
                      </span>
                      <input
                        type="text"
                        value={addressForm.streetAddress}
                        onChange={(event) =>
                          updateAddressField(
                            "streetAddress",
                            event.target.value,
                          )
                        }
                        className={fieldClassName("streetAddress")}
                        autoComplete="street-address"
                        {...addressInputProps}
                      />
                      {fieldErrors.streetAddress ? (
                        <span className="mt-1 block text-xs text-dark-green/80">
                          {fieldErrors.streetAddress}
                        </span>
                      ) : null}
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm text-dark-green">
                          {country}{" "}
                          <span className="text-red-600" aria-hidden>
                            *
                          </span>
                        </span>
                        <select
                          value={addressForm.country}
                          onChange={(event) =>
                            updateAddressField("country", event.target.value)
                          }
                          className={fieldClassName("country")}
                          autoComplete="country"
                          disabled={
                            isAddressLocked ||
                            isLoadingAddress ||
                            isLoadingCountries ||
                            shippingCountries.length === 0
                          }
                        >
                          {isLoadingCountries ? (
                            <option value="">Loading countries...</option>
                          ) : shippingCountries.length === 0 ? (
                            <option value="">No countries available</option>
                          ) : (
                            shippingCountries.map((rate) => (
                              <option key={rate.id} value={rate.country}>
                                {rate.country}
                              </option>
                            ))
                          )}
                        </select>
                        {fieldErrors.country ? (
                          <span className="mt-1 block text-xs text-dark-green/80">
                            {fieldErrors.country}
                          </span>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm text-dark-green">
                          {stateProvince}
                        </span>
                        <input
                          type="text"
                          value={addressForm.stateProvince}
                          onChange={(event) =>
                            updateAddressField(
                              "stateProvince",
                              event.target.value,
                            )
                          }
                          className={`${inputClassName} border-beige ${
                            isAddressLocked
                              ? "cursor-default bg-beige/40 text-dark-green/80"
                              : ""
                          }`}
                          autoComplete="address-level1"
                          {...addressInputProps}
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm text-dark-green">
                          {city}{" "}
                          <span className="text-red-600" aria-hidden>
                            *
                          </span>
                        </span>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(event) =>
                            updateAddressField("city", event.target.value)
                          }
                          className={fieldClassName("city")}
                          autoComplete="address-level2"
                          {...addressInputProps}
                        />
                        {fieldErrors.city ? (
                          <span className="mt-1 block text-xs text-dark-green/80">
                            {fieldErrors.city}
                          </span>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm text-dark-green">
                          {zipPostalCode}{" "}
                          <span className="text-red-600" aria-hidden>
                            *
                          </span>
                        </span>
                        <input
                          type="text"
                          value={addressForm.zipPostalCode}
                          onChange={(event) =>
                            updateAddressField(
                              "zipPostalCode",
                              event.target.value,
                            )
                          }
                          className={fieldClassName("zipPostalCode")}
                          autoComplete="postal-code"
                          {...addressInputProps}
                        />
                        {fieldErrors.zipPostalCode ? (
                          <span className="mt-1 block text-xs text-dark-green/80">
                            {fieldErrors.zipPostalCode}
                          </span>
                        ) : null}
                      </label>
                    </div>

                    <label className="block sm:max-w-[50%]">
                      <span className="mb-1 block text-sm text-dark-green">
                        {phoneNumber}{" "}
                        <span className="text-red-600" aria-hidden>
                          *
                        </span>
                      </span>
                      <input
                        type="tel"
                        value={addressForm.phoneNumber}
                        onChange={(event) =>
                          updateAddressField("phoneNumber", event.target.value)
                        }
                        className={fieldClassName("phoneNumber")}
                        autoComplete="tel"
                        {...addressInputProps}
                      />
                      {fieldErrors.phoneNumber ? (
                        <span className="mt-1 block text-xs text-dark-green/80">
                          {fieldErrors.phoneNumber}
                        </span>
                      ) : null}
                    </label>
                  </div>
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
                    <option value="online">{onlinePayment}</option>
                    <option value="paypal">{onlinePaymentPaypal}</option>
                  </select>
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

                {paymentType === "paypal" ? (
                  <PayPalCheckoutButtons
                    disabled={
                      isLoadingCountries ||
                      shippingCountries.length === 0 ||
                      items.length === 0
                    }
                    refreshKey={`${orderTotal}-${itemCount}`}
                    orderFailedMessage={orderFailed}
                    onBeforePay={() => {
                      if (status !== "authenticated") {
                        setSignInOpen(true);
                        return false;
                      }

                      if (!validateAddressForm() || !selectedShippingCountry) {
                        setAddressError(completeDeliveryAddress);
                        return false;
                      }

                      setAddressError(null);
                      return true;
                    }}
                    getOrderPayload={() => {
                      if (!selectedShippingCountry) {
                        return null;
                      }

                      const formattedAddress = formatDeliveryAddress(
                        addressForm,
                        selectedCountryLabel,
                      );

                      return {
                        firstName: addressForm.firstName.trim(),
                        lastName: addressForm.lastName.trim(),
                        streetAddress: addressForm.streetAddress.trim(),
                        country: selectedCountryLabel,
                        stateProvince: addressForm.stateProvince.trim(),
                        city: addressForm.city.trim(),
                        zipPostalCode: addressForm.zipPostalCode.trim(),
                        phoneNumber: addressForm.phoneNumber.trim(),
                        address: formattedAddress,
                        shippingFee: shippingFeeAmount,
                        products: items.map((item) => ({
                          slug: item.slug,
                          name: item.name,
                          price: item.price,
                          image: item.image,
                          quantity: item.quantity,
                        })),
                      };
                    }}
                    onPaid={() => {
                      clearCart();
                      setHasSavedAddress(true);
                      setIsEditingAddress(false);
                      toast.success(orderPlaced);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => void handlePlaceOrder()}
                    disabled={
                      isLoadingCountries || shippingCountries.length === 0
                    }
                    className="mt-6 w-full rounded-md bg-dark-green px-4 py-3.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {continueToPayment}
                  </button>
                )}
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

export default function Cart() {
  return (
    <Suspense fallback={<main className="flex-1 bg-warm-white" aria-hidden />}>
      <CartContent />
    </Suspense>
  );
}
