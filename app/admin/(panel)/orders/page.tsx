"use client";

import { useEffect, useMemo, useState } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { formatPrice } from "@/app/lib/price";

type OrderStatus = "pending" | "completed";
type OrderFilter = "all" | "pending" | "completed";
type PaymentMethod = "cod" | "online" | "paypal";
type PaymentStatus = "pending" | "paid";

type OrderProduct = {
  slug: string;
  name: string;
  price: string;
  image: string;
  quantity: number;
};

type AdminOrder = {
  id: string;
  orderId: string;
  customerName: string;
  email: string;
  firstName: string;
  lastName: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
  address: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  price: number;
  shippingFee: number;
  itemsSummary: string;
  itemNames: string[];
  products: OrderProduct[];
  total: number;
  date: string;
  status: OrderStatus;
};

type OrdersApiResponse = {
  ok: boolean;
  orders?: AdminOrder[];
  error?: string;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dark-green/45">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm text-dark-green">
        {value || "—"}
      </p>
    </div>
  );
}

export default function AdminOrdersPage() {
  const {
    ordersTitle,
    ordersDescription,
    ordersFilters,
    ordersTable,
    ordersEmpty,
    statusUpdated,
  } = useMessages().adminPanel;

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/orders");
        const data = (await response.json()) as OrdersApiResponse;

        if (!response.ok || !data.ok || !data.orders) {
          throw new Error(data.error ?? ordersTable.loadError);
        }

        setOrders(
          data.orders.map((order) => ({
            ...order,
            firstName: order.firstName ?? "",
            lastName: order.lastName ?? "",
            streetAddress: order.streetAddress ?? "",
            country: order.country ?? "",
            stateProvince: order.stateProvince ?? "",
            city: order.city ?? "",
            zipPostalCode: order.zipPostalCode ?? "",
            phoneNumber: order.phoneNumber ?? "",
            paymentMethod: order.paymentMethod ?? "online",
            paymentStatus: order.paymentStatus ?? "pending",
            price: order.price ?? order.total,
            shippingFee: order.shippingFee ?? 0,
            itemNames: order.itemNames ?? order.products.map((p) => p.name),
          })),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : ordersTable.loadError,
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrders();
  }, [ordersTable.loadError]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") {
      return orders;
    }

    return orders.filter((order) => order.status === activeFilter);
  }, [orders, activeFilter]);

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    );
    toast.success(statusUpdated);
  };

  const paymentLabel = (method: PaymentMethod) => {
    if (method === "paypal") {
      return ordersTable.paymentPaypal;
    }
    if (method === "online") {
      return ordersTable.paymentOnline;
    }
    return ordersTable.paymentCod;
  };

  const paymentStatusLabel = (status: PaymentStatus) =>
    status === "paid" ? ordersTable.paymentPaid : ordersTable.paymentPending;

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">{ordersTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-green/70 sm:mt-3 sm:text-base">
        {ordersDescription}
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {ordersFilters.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id as OrderFilter)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-dark-green text-warm-white"
                  : "border border-beige bg-beige/40 text-dark-green hover:bg-beige/70"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="rounded-3xl border border-beige bg-beige/20 px-6 py-12 text-center text-sm text-dark-green/70">
            {ordersTable.loading}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-beige bg-beige/20 px-6 py-12 text-center text-sm text-red-600">
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-beige bg-beige/20 px-6 py-12 text-center text-sm text-dark-green/70">
            {ordersEmpty}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-3xl border border-beige bg-warm-white/70 shadow-sm"
              >
                <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="text-base font-bold text-dark-green">
                        {order.orderId}
                      </h2>
                      <span className="text-sm text-dark-green/60">
                        {order.date}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-dark-green">
                      {order.firstName || order.lastName
                        ? `${order.firstName} ${order.lastName}`.trim()
                        : order.customerName}
                    </p>
                    <p className="text-sm text-dark-green/70">{order.email}</p>
                    <p className="text-sm text-dark-green/70">
                      {ordersTable.items}: {order.itemsSummary}
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                    <p className="text-base font-bold text-dark-green">
                      {formatPrice(order.total, "€0.00")}
                    </p>
                    <select
                      value={order.status}
                      onChange={(event) =>
                        handleStatusChange(
                          order.id,
                          event.target.value as OrderStatus,
                        )
                      }
                      className="w-full rounded-xl border border-beige bg-warm-white px-3 py-2 text-sm font-medium text-dark-green outline-none transition-colors focus:border-gold sm:w-auto"
                      aria-label={`${ordersTable.status} ${order.orderId}`}
                    >
                      <option value="pending">
                        {ordersTable.statusPending}
                      </option>
                      <option value="completed">
                        {ordersTable.statusCompleted}
                      </option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrderId(isExpanded ? null : order.id)
                      }
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-beige bg-beige/40 px-3 py-2 text-sm font-semibold text-dark-green transition-colors hover:bg-beige/70 sm:w-auto"
                    >
                      {isExpanded
                        ? ordersTable.hideDetails
                        : ordersTable.viewDetails}
                      {isExpanded ? (
                        <LuChevronUp className="h-4 w-4" aria-hidden />
                      ) : (
                        <LuChevronDown className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-beige bg-beige/20 px-5 py-5 sm:px-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <section>
                        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-dark-green/60">
                          {ordersTable.deliveryDetails}
                        </h3>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <DetailItem
                            label={ordersTable.firstName}
                            value={order.firstName}
                          />
                          <DetailItem
                            label={ordersTable.lastName}
                            value={order.lastName}
                          />
                          <DetailItem
                            label={ordersTable.streetAddress}
                            value={order.streetAddress}
                          />
                          <DetailItem
                            label={ordersTable.country}
                            value={order.country}
                          />
                          <DetailItem
                            label={ordersTable.stateProvince}
                            value={order.stateProvince}
                          />
                          <DetailItem
                            label={ordersTable.city}
                            value={order.city}
                          />
                          <DetailItem
                            label={ordersTable.zipPostalCode}
                            value={order.zipPostalCode}
                          />
                          <DetailItem
                            label={ordersTable.phoneNumber}
                            value={order.phoneNumber}
                          />
                          <DetailItem
                            label={ordersTable.email}
                            value={order.email}
                          />
                        </div>
                      </section>

                      <section>
                        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-dark-green/60">
                          {ordersTable.orderSummary}
                        </h3>
                        <div className="mt-4 space-y-4">
                          <DetailItem
                            label={ordersTable.paymentMethod}
                            value={paymentLabel(order.paymentMethod)}
                          />
                          <DetailItem
                            label={ordersTable.paymentStatus}
                            value={paymentStatusLabel(order.paymentStatus)}
                          />
                          <DetailItem
                            label={ordersTable.items}
                            value={
                              order.products.length > 0
                                ? order.products
                                    .map(
                                      (product) =>
                                        `${product.name} × ${product.quantity} (${product.price})`,
                                    )
                                    .join("\n")
                                : order.itemsSummary
                            }
                          />
                          <div className="rounded-2xl border border-beige bg-warm-white/80 p-4 text-sm text-dark-green">
                            <div className="flex items-center justify-between">
                              <span>{ordersTable.price}</span>
                              <span>
                                {formatPrice(order.price, "€0.00")}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span>{ordersTable.shippingFee}</span>
                              <span>
                                {order.shippingFee === 0
                                  ? ordersTable.shippingFree
                                  : formatPrice(order.shippingFee, "€0.00")}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-beige pt-3 font-bold">
                              <span>{ordersTable.total}</span>
                              <span>
                                {formatPrice(order.total, "€0.00")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
