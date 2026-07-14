"use client";

import { FormEvent, useEffect, useState } from "react";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";
import { formatPrice } from "@/app/lib/price";

type ShippingRateItem = {
  id: string;
  country: string;
  price: number;
  enabled: boolean;
};

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white px-3 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

export default function ShippingRate() {
  const [rates, setRates] = useState<ShippingRateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [price, setPrice] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/shipping");
      const data = (await response.json()) as {
        ok?: boolean;
        rates?: ShippingRateItem[];
        error?: string;
      };

      if (!response.ok || !data.ok || !data.rates) {
        throw new Error(data.error ?? "Failed to load shipping rates.");
      }

      setRates(data.rates);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load shipping rates.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRates();
  }, []);

  const handleAddCountry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedCountry = country.trim();
    const parsedPrice = Number.parseFloat(price);

    if (!trimmedCountry) {
      toast.error("Country is required.");
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Enter a valid shipping price.");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: trimmedCountry,
          price: parsedPrice,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        rate?: ShippingRateItem;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.rate) {
        throw new Error(data.error ?? "Failed to add country.");
      }

      setRates((current) =>
        [...current, data.rate!].sort((a, b) =>
          a.country.localeCompare(b.country),
        ),
      );
      setCountry("");
      setPrice("");
      toast.success("Country added.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add country.",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (rate: ShippingRateItem) => {
    setEditingId(rate.id);
    setEditPrice(rate.price.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPrice("");
  };

  const saveEdit = async (id: string) => {
    const parsedPrice = Number.parseFloat(editPrice);

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Enter a valid shipping price.");
      return;
    }

    setBusyId(id);
    try {
      const response = await fetch("/api/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, price: parsedPrice }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        rate?: ShippingRateItem;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.rate) {
        throw new Error(data.error ?? "Failed to update shipping price.");
      }

      setRates((current) =>
        current.map((rate) => (rate.id === id ? data.rate! : rate)),
      );
      cancelEdit();
      toast.success("Shipping price updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update shipping price.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const toggleEnabled = async (rate: ShippingRateItem) => {
    setBusyId(rate.id);
    try {
      const response = await fetch("/api/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rate.id,
          enabled: !rate.enabled,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        rate?: ShippingRateItem;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.rate) {
        throw new Error(data.error ?? "Failed to update country status.");
      }

      setRates((current) =>
        current.map((item) => (item.id === rate.id ? data.rate! : item)),
      );
      toast.success(
        data.rate.enabled ? "Country enabled." : "Country disabled.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update country status.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteCountry = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/shipping?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to delete country.");
      }

      setRates((current) => current.filter((rate) => rate.id !== id));
      if (editingId === id) {
        cancelEdit();
      }
      toast.success("Country deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete country.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-green">Shipping Rates</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-dark-green/70">
        Manage shipping countries, prices, and availability.
      </p>

      <form
        onSubmit={(event) => void handleAddCountry(event)}
        className="mt-8 rounded-3xl border border-beige bg-beige/20 p-5 sm:p-6"
      >
        <h2 className="text-lg font-bold text-dark-green">Add Country</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              Country
            </span>
            <input
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Germany"
              className={inputClassName}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              Shipping Price
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
              className={inputClassName}
              required
            />
          </label>
          <button
            type="submit"
            disabled={isAdding}
            className="rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? "Adding..." : "Add Country"}
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-3xl border border-beige bg-beige/20">
        {isLoading ? (
          <p className="px-6 py-12 text-center text-sm text-dark-green/70">
            Loading shipping rates...
          </p>
        ) : rates.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-dark-green/70">
            No shipping countries added yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-beige bg-beige/40 text-dark-green/70">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-6">Country</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    Shipping Price
                  </th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => {
                  const isEditing = editingId === rate.id;
                  const isBusy = busyId === rate.id;

                  return (
                    <tr
                      key={rate.id}
                      className="border-b border-beige/70 bg-warm-white/60 last:border-b-0"
                    >
                      <td className="px-4 py-4 font-medium text-dark-green sm:px-6">
                        {rate.country}
                      </td>
                      <td className="px-4 py-4 text-dark-green sm:px-6">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPrice}
                            onChange={(event) =>
                              setEditPrice(event.target.value)
                            }
                            className={`${inputClassName} max-w-[140px]`}
                          />
                        ) : (
                          formatPrice(rate.price, "€0.00")
                        )}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            rate.enabled
                              ? "bg-dark-green/10 text-dark-green"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {rate.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex flex-wrap items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void saveEdit(rate.id)}
                                disabled={isBusy}
                                className="rounded-full bg-dark-green px-3 py-1.5 text-xs font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isBusy}
                                className="rounded-full border border-beige px-3 py-1.5 text-xs font-semibold text-dark-green transition-colors hover:bg-beige/60 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(rate)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 rounded-full border border-beige px-3 py-1.5 text-xs font-semibold text-dark-green transition-colors hover:bg-beige/60 disabled:opacity-60"
                              >
                                <LuPencil className="h-3.5 w-3.5" aria-hidden />
                                Edit Price
                              </button>
                              <button
                                type="button"
                                onClick={() => void toggleEnabled(rate)}
                                disabled={isBusy}
                                className="rounded-full border border-beige px-3 py-1.5 text-xs font-semibold text-dark-green transition-colors hover:bg-beige/60 disabled:opacity-60"
                              >
                                {rate.enabled ? "Disable" : "Enable"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteCountry(rate.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                              >
                                <LuTrash2 className="h-3.5 w-3.5" aria-hidden />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
