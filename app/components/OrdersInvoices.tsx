"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { formatPrice } from "@/app/lib/price";

type InvoiceProduct = {
  name: string;
  quantity: number;
  price: string;
  image: string;
};

type InvoiceOrder = {
  id: string;
  orderNumber: string;
  invoiceDate: string;
  paymentDate: string;
  paymentStatus: "pending" | "paid";
  paymentMethod: "cod" | "online" | "paypal";
  fullName: string;
  email: string;
  phoneNumber: string;
  shippingAddress: string;
  billingAddress: string;
  products: InvoiceProduct[];
  price: number;
  shippingFee: number;
  total: number;
};

type OrdersApiResponse = {
  ok: boolean;
  orders?: InvoiceOrder[];
  error?: string;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-dark-green/50">
        {label}
      </dt>
      <dd className="whitespace-pre-line break-words text-sm text-dark-green">
        {value || "—"}
      </dd>
    </div>
  );
}

export default function OrdersInvoices() {
  const { status } = useSession();
  const copy = useMessages().ordersPage;
  const [orders, setOrders] = useState<InvoiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated") {
      setIsLoading(false);
      setOrders([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/user/orders");
        const data = (await response.json()) as OrdersApiResponse;

        if (!response.ok || !data.ok || !data.orders) {
          throw new Error(data.error ?? copy.loadError);
        }

        if (!cancelled) {
          setOrders(data.orders);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : copy.loadError,
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [status, copy.loadError]);

  const paymentMethodLabel = (method: InvoiceOrder["paymentMethod"]) => {
    if (method === "paypal") {
      return copy.paymentPaypal;
    }
    if (method === "cod") {
      return copy.paymentCod;
    }
    return copy.paymentOnline;
  };

  const paymentStatusLabel = (value: InvoiceOrder["paymentStatus"]) =>
    value === "paid" ? copy.paymentPaid : copy.paymentPending;

  if (status === "loading" || isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-dark-green/70 sm:text-base">
          {copy.subtitle}
        </p>
        <p className="mt-8 text-sm text-dark-green/70">{copy.loading}</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-dark-green/70 sm:text-base">
          {copy.subtitle}
        </p>
        <div className="mt-8 rounded-3xl border border-beige bg-beige/20 px-6 py-10">
          <p className="text-sm text-dark-green/80">{copy.signInRequired}</p>
          <Link
            href="/?signin=true"
            className="mt-4 inline-flex rounded-full bg-dark-green px-4 py-2 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90"
          >
            {copy.signIn}
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-dark-green/70 sm:text-base">
          {copy.subtitle}
        </p>
        <p className="mt-8 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-dark-green/70 sm:text-base">
          {copy.subtitle}
        </p>
        <div className="mt-8 rounded-3xl border border-beige bg-beige/20 px-6 py-10">
          <p className="text-sm text-dark-green/80">{copy.empty}</p>
          <Link
            href="/#products"
            className="mt-4 inline-flex rounded-full bg-dark-green px-4 py-2 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90"
          >
            {copy.continueShopping}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm text-dark-green/70 sm:text-base">
        {copy.subtitle}
      </p>

      <div className="mt-8 space-y-8">
      {orders.map((order) => (
        <article
          key={order.id}
          className="overflow-hidden rounded-3xl border border-beige bg-warm-white shadow-sm"
        >
          <div className="border-b border-beige bg-beige/40 px-5 py-5 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-green/50">
              {copy.invoice}
            </p>
            <h2 className="mt-1 text-xl font-bold text-dark-green">
              {order.orderNumber}
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailRow label={copy.orderNumber} value={order.orderNumber} />
              <DetailRow label={copy.invoiceDate} value={order.invoiceDate} />
              <DetailRow
                label={copy.paymentDate}
                value={order.paymentDate || "—"}
              />
              <DetailRow
                label={copy.paymentStatus}
                value={paymentStatusLabel(order.paymentStatus)}
              />
            </dl>
          </div>

          <div className="space-y-8 px-5 py-6 sm:px-8">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-dark-green/60">
                {copy.customerInformation}
              </h3>
              <dl className="mt-4 space-y-3">
                <DetailRow label={copy.fullName} value={order.fullName} />
                <DetailRow label={copy.email} value={order.email} />
                <DetailRow
                  label={copy.phoneNumber}
                  value={order.phoneNumber}
                />
              </dl>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-dark-green/60">
                  {copy.shippingAddress}
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-dark-green">
                  {order.shippingAddress || "—"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-dark-green/60">
                  {copy.billingAddress}
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-dark-green">
                  {order.billingAddress || "—"}
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-dark-green/60">
                {copy.orderedProducts}
              </h3>
              <ul className="mt-4 divide-y divide-beige overflow-hidden rounded-2xl border border-beige">
                {order.products.map((product) => (
                  <li
                    key={`${order.id}-${product.name}-${product.quantity}`}
                    className="flex items-center gap-4 bg-beige/10 px-4 py-3"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-beige/40">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-dark-green">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-dark-green/60">
                        {copy.quantity}: {product.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-dark-green">
                      {product.price}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-dark-green/60">
                {copy.orderSummary}
              </h3>
              <div className="mt-4 space-y-3 rounded-2xl border border-beige bg-beige/20 p-4 text-sm text-dark-green">
                <div className="flex items-center justify-between gap-4">
                  <span>{copy.paymentMethod}</span>
                  <span className="font-medium">
                    {paymentMethodLabel(order.paymentMethod)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>{copy.subtotal}</span>
                  <span>{formatPrice(order.price, "€0.00")}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>{copy.shippingFee}</span>
                  <span>
                    {order.shippingFee === 0
                      ? copy.shippingFree
                      : formatPrice(order.shippingFee, "€0.00")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-beige pt-3 text-base font-bold">
                  <span>{copy.total}</span>
                  <span>{formatPrice(order.total, "€0.00")}</span>
                </div>
              </div>
            </section>

            <footer className="border-t border-beige pt-6 text-center">
              <p className="text-sm font-medium text-dark-green">
                {copy.thankYouTitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-dark-green/70">
                {copy.thankYouMessage}
              </p>
            </footer>
          </div>
        </article>
      ))}
      </div>
    </div>
  );
}
