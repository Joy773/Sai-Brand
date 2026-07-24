"use client";

import { useEffect, useState } from "react";
import { LuEuro, LuShoppingBag, LuUsers } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";
import { formatPrice } from "@/app/lib/price";

type DashboardStatId = "users" | "orders" | "revenue";

type DashboardStats = Record<DashboardStatId, string>;

const statIcons = {
  users: LuUsers,
  orders: LuShoppingBag,
  revenue: LuEuro,
} as const;

const emptyStats: DashboardStats = {
  users: "0",
  orders: "0",
  revenue: formatPrice(0, "€0.00"),
};

type UsersApiResponse = {
  ok: boolean;
  users?: unknown[];
  error?: string;
};

type OrdersApiResponse = {
  ok: boolean;
  orders?: Array<{
    total: number;
    paymentMethod?: "cod" | "online" | "paypal";
    paymentStatus?: "pending" | "paid";
  }>;
  error?: string;
};

export default function AdminDashboardPage() {
  const {
    dashboardTitle,
    dashboardDescription,
    dashboardStats,
    dashboardLoading,
    dashboardLoadError,
  } = useMessages().adminPanel;

  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const [usersResponse, ordersResponse] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/orders"),
        ]);

        const usersData = (await usersResponse.json()) as UsersApiResponse;
        const ordersData = (await ordersResponse.json()) as OrdersApiResponse;

        if (!usersResponse.ok || !usersData.ok || !usersData.users) {
          throw new Error(usersData.error ?? dashboardLoadError);
        }

        if (!ordersResponse.ok || !ordersData.ok || !ordersData.orders) {
          throw new Error(ordersData.error ?? dashboardLoadError);
        }

        const totalRevenue = ordersData.orders.reduce((sum, order) => {
          const isPaidOnline =
            (order.paymentMethod === "online" ||
              order.paymentMethod === "paypal") &&
            order.paymentStatus === "paid";

          if (!isPaidOnline) {
            return sum;
          }

          return sum + order.total;
        }, 0);

        setStats({
          users: String(usersData.users.length),
          orders: String(ordersData.orders.length),
          revenue: formatPrice(totalRevenue, "€0.00"),
        });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : dashboardLoadError,
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboardStats();
  }, [dashboardLoadError]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">{dashboardTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-green/70 sm:mt-3 sm:text-base">
        {dashboardDescription}
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-dark-green/70">{dashboardLoading}</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardStats.map((stat) => {
            const Icon = statIcons[stat.id as DashboardStatId];
            const value = stats[stat.id as DashboardStatId];

            return (
              <article
                key={stat.id}
                className="rounded-3xl border border-beige bg-beige/40 p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-dark-green/70">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-dark-green sm:text-4xl">
                      {value}
                    </p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-dark-green/10 text-dark-green">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
