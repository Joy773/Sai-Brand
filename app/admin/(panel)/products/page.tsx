"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";
import AddProductModal, {
  type NewProductInput,
  type ProductLocaleContent,
  type ProductStatus,
  type ProductType,
} from "@/app/components/AddProductModal";
import { useMessages } from "@/app/i18n/LocaleProvider";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  productType: ProductType;
  price: string;
  size: string;
  sizeMl?: number | null;
  kitSize?: string;
  images: string[];
  status: ProductStatus;
  translations: {
    en: ProductLocaleContent;
    de: ProductLocaleContent;
    ar: ProductLocaleContent;
  };
};

const statusStyles: Record<ProductStatus, string> = {
  in_stock: "bg-dark-green/10 text-dark-green",
  low_stock: "bg-gold/20 text-dark-green",
};

const emptyLocaleContent = (): ProductLocaleContent => ({
  name: "",
  description: "",
  ingredients: "",
  keyBenefits: "",
  safetyNotes: "",
  howToUse: "",
});

function toFormValues(product: AdminProduct): NewProductInput {
  return {
    productType: product.productType ?? "single",
    en: product.translations?.en ?? emptyLocaleContent(),
    de: product.translations?.de ?? emptyLocaleContent(),
    ar: product.translations?.ar ?? emptyLocaleContent(),
    price: product.price.replace(/[^\d.]/g, ""),
    sizeMl:
      product.sizeMl != null
        ? String(product.sizeMl)
        : product.productType === "single"
          ? product.size.replace(/[^\d]/g, "")
          : "",
    kitSize:
      product.kitSize ||
      (product.productType === "kit" ? product.size : ""),
    status: product.status,
    images: product.images ?? [],
  };
}

export default function AdminProductsPage() {
  const {
    productsTitle,
    productsDescription,
    productsTable,
  } = useMessages().adminPanel;

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null,
  );

  const modalInitialValues = useMemo(
    () => (editingProduct ? toFormValues(editingProduct) : null),
    [editingProduct],
  );

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/products");
        const data = (await response.json()) as {
          ok?: boolean;
          products?: AdminProduct[];
          error?: string;
        };

        if (!response.ok || !data.ok || !data.products) {
          throw new Error(data.error ?? productsTable.saveError);
        }

        if (!cancelled) {
          setProducts(data.products);
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load products.",
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
  }, [productsTable.saveError]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleAddProduct = async (input: NewProductInput) => {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      product?: AdminProduct;
      error?: string;
    };

    if (!response.ok || !data.ok || !data.product) {
      throw new Error(data.error ?? productsTable.saveError);
    }

    setProducts((current) => [data.product!, ...current]);
  };

  const handleUpdateProduct = async (input: NewProductInput) => {
    if (!editingProduct) {
      throw new Error(productsTable.updateError);
    }

    const response = await fetch("/api/products", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingProduct.id,
        ...input,
      }),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      product?: AdminProduct;
      error?: string;
    };

    if (!response.ok || !data.ok || !data.product) {
      throw new Error(data.error ?? productsTable.updateError);
    }

    setProducts((current) =>
      current.map((product) =>
        product.id === editingProduct.id ? data.product! : product,
      ),
    );
  };

  const handleModalSubmit = async (input: NewProductInput) => {
    if (editingProduct) {
      await handleUpdateProduct(input);
      return;
    }

    await handleAddProduct(input);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (deletingId) {
      return;
    }

    setDeletingId(productId);

    try {
      const response = await fetch(
        `/api/products?id=${encodeURIComponent(productId)}`,
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? productsTable.deleteError);
      }

      setProducts((current) =>
        current.filter((product) => product.id !== productId),
      );
      toast.success(productsTable.productDeleted);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : productsTable.deleteError,
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">{productsTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-green/70 sm:mt-3 sm:text-base">
            {productsDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90"
        >
          {productsTable.addProduct}
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-beige bg-beige/20">
        <div className="overflow-x-auto">
          <table className="min-w-[40rem] w-full text-left text-sm md:min-w-full">
            <thead className="border-b border-beige bg-beige/40 text-dark-green/70">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-6">
                  {productsTable.product}
                </th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell sm:px-6">
                  {productsTable.sku}
                </th>
                <th className="px-4 py-3 font-semibold sm:px-6">
                  {productsTable.price}
                </th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell sm:px-6">
                  {productsTable.size}
                </th>
                <th className="px-4 py-3 font-semibold sm:px-6">
                  {productsTable.status}
                </th>
                <th className="px-4 py-3 font-semibold sm:px-6">
                  {productsTable.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-dark-green/70 sm:px-6"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-dark-green/70 sm:px-6"
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-beige/70 bg-warm-white/60 last:border-b-0"
                  >
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-beige bg-beige/30">
                          <Image
                            src={product.images[0] ?? "/hero-img.png"}
                            alt={product.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-dark-green">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs text-dark-green/60 md:hidden">
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 text-dark-green/80 md:table-cell sm:px-6">
                      {product.slug}
                    </td>
                    <td className="px-4 py-4 font-medium text-dark-green sm:px-6">
                      {product.price}
                    </td>
                    <td className="hidden px-4 py-4 text-dark-green/80 sm:table-cell sm:px-6">
                      {product.size}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[product.status]}`}
                      >
                        {product.status === "in_stock"
                          ? productsTable.statusInStock
                          : productsTable.statusLowStock}
                      </span>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dark-green/20 px-3 py-1.5 text-xs font-semibold text-dark-green transition-colors hover:bg-dark-green/5 sm:w-auto"
                          aria-label={`${productsTable.update} ${product.name}`}
                        >
                          <LuPencil className="h-3.5 w-3.5" aria-hidden />
                          {productsTable.update}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteProduct(product.id)}
                          disabled={deletingId === product.id}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          aria-label={`${productsTable.delete} ${product.name}`}
                        >
                          <LuTrash2 className="h-3.5 w-3.5" aria-hidden />
                          {productsTable.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        mode={editingProduct ? "edit" : "create"}
        initialValues={modalInitialValues}
      />
    </div>
  );
}
