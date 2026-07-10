"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { formatPrice } from "@/app/lib/price";

type OrderStatus = "pending" | "completed";
type OrderFilter = "all" | "pending" | "completed";

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
  address: string;
  itemsSummary: string;
  products: OrderProduct[];
  total: number;
  date: string;
  status: OrderStatus;
};

type OrdersApiResponse = {
  ok: boolean;
  orders?: Array<{
    id: string;
    orderId: string;
    customerName: string;
    email: string;
    address: string;
    itemsSummary: string;
    products: OrderProduct[];
    total: number;
    date: string;
    status: OrderStatus;
  }>;
  error?: string;
};

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

        setOrders(data.orders);
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

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-green">{ordersTitle}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-dark-green/70">
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

      <div className="mt-6 overflow-hidden rounded-3xl border border-beige bg-beige/20">
        {isLoading ? (
          <p className="px-6 py-12 text-center text-sm text-dark-green/70">
            {ordersTable.loading}
          </p>
        ) : error ? (
          <p className="px-6 py-12 text-center text-sm text-red-600">{error}</p>
        ) : filteredOrders.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-dark-green/70">
            {ordersEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-beige bg-beige/40 text-dark-green/70">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    {ordersTable.orderId}
                  </th>
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    {ordersTable.customer}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell sm:px-6">
                    {ordersTable.email}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell sm:px-6">
                    {ordersTable.address}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold xl:table-cell sm:px-6">
                    {ordersTable.items}
                  </th>
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    {ordersTable.total}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell sm:px-6">
                    {ordersTable.date}
                  </th>
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    {ordersTable.status}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-beige/70 bg-warm-white/60 last:border-b-0"
                  >
                    <td className="px-4 py-4 font-medium text-dark-green sm:px-6">
                      {order.orderId}
                    </td>
                    <td className="px-4 py-4 text-dark-green sm:px-6">
                      <p>{order.customerName}</p>
                      <p className="mt-0.5 text-xs text-dark-green/60 md:hidden">
                        {order.email}
                      </p>
                    </td>
                    <td className="hidden px-4 py-4 text-dark-green/80 md:table-cell sm:px-6">
                      {order.email}
                    </td>
                    <td className="hidden max-w-xs px-4 py-4 text-dark-green/80 lg:table-cell sm:px-6">
                      {order.address}
                    </td>
                    <td className="hidden px-4 py-4 text-dark-green/80 xl:table-cell sm:px-6">
                      {order.itemsSummary}
                    </td>
                    <td className="px-4 py-4 font-medium text-dark-green sm:px-6">
                      {formatPrice(order.total, "€0.00")}
                    </td>
                    <td className="hidden px-4 py-4 text-dark-green/80 sm:table-cell sm:px-6">
                      {order.date}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <select
                        value={order.status}
                        onChange={(event) =>
                          handleStatusChange(
                            order.id,
                            event.target.value as OrderStatus,
                          )
                        }
                        className="rounded-xl border border-beige bg-warm-white px-3 py-2 text-sm font-medium text-dark-green outline-none transition-colors focus:border-gold"
                        aria-label={`${ordersTable.status} ${order.orderId}`}
                      >
                        <option value="pending">
                          {ordersTable.statusPending}
                        </option>
                        <option value="completed">
                          {ordersTable.statusCompleted}
                        </option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
