"use client";

import Image from "next/image";
import { useState } from "react";
import { LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";
import AddProductModal, {
  type NewProductInput,
  type ProductStatus,
} from "@/app/components/AddProductModal";
import { useMessages } from "@/app/i18n/LocaleProvider";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  price: string;
  size: string;
  images: string[];
  status: ProductStatus;
  description: string;
  ingredients: string;
  keyBenefits: string;
  safetyNotes: string;
  howToUse: string;
};

const initialProducts: AdminProduct[] = [
  {
    id: "PRD-001",
    name: "Hajj & Umrah Personal Care Kit",
    slug: "german-care-complete-kit",
    price: "€53.99",
    size: "4-piece travel kit",
    images: ["/hero-img.png"],
    status: "in_stock",
    description: "",
    ingredients: "",
    keyBenefits: "",
    safetyNotes: "",
    howToUse: "",
  },
  {
    id: "PRD-002",
    name: "Anti-Chafing Body Cream",
    slug: "anti-chafing-body-cream",
    price: "€15.90",
    size: "50 ml",
    images: ["/anti-chafing-main.png"],
    status: "in_stock",
    description: "",
    ingredients: "",
    keyBenefits: "",
    safetyNotes: "",
    howToUse: "",
  },
  {
    id: "PRD-003",
    name: "Deodorant Roller – Fragrance-Free",
    slug: "deodorant-roller",
    price: "€13.99",
    size: "50 ml",
    images: ["/deodoran-main.png"],
    status: "low_stock",
    description: "",
    ingredients: "",
    keyBenefits: "",
    safetyNotes: "",
    howToUse: "",
  },
  {
    id: "PRD-004",
    name: "Daily Use Shampoo – Fragrance-Free",
    slug: "daily-use-shampoo",
    price: "€12.99",
    size: "100 ml",
    images: ["/shampoo-main.png"],
    status: "in_stock",
    description: "",
    ingredients: "",
    keyBenefits: "",
    safetyNotes: "",
    howToUse: "",
  },
  {
    id: "PRD-005",
    name: "Sunblock SPF 50+ with Hyaluronic Acid",
    slug: "sunblock-spf-50",
    price: "€18.99",
    size: "60 ml",
    images: ["/sunblock-main.png"],
    status: "in_stock",
    description: "",
    ingredients: "",
    keyBenefits: "",
    safetyNotes: "",
    howToUse: "",
  },
];

const statusStyles: Record<ProductStatus, string> = {
  in_stock: "bg-dark-green/10 text-dark-green",
  low_stock: "bg-gold/20 text-dark-green",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatPrice(value: string): string {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) {
    return value;
  }

  return `€${amount.toFixed(2)}`;
}

function createProductId(existingProducts: AdminProduct[]): string {
  const maxId = existingProducts.reduce((max, product) => {
    const numericPart = Number.parseInt(product.id.replace(/\D/g, ""), 10);
    return Number.isNaN(numericPart) ? max : Math.max(max, numericPart);
  }, 0);

  return `PRD-${String(maxId + 1).padStart(3, "0")}`;
}

export default function AdminProductsPage() {
  const {
    productsTitle,
    productsDescription,
    productsTable,
  } = useMessages().adminPanel;

  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddProduct = (input: NewProductInput) => {
    const slug = slugify(input.name);

    setProducts((current) => [
      {
        id: createProductId(current),
        name: input.name.trim(),
        slug: slug || `product-${Date.now()}`,
        price: formatPrice(input.price),
        size: `${input.sizeMl} ml`,
        images:
          input.images.length > 0 ? input.images : ["/hero-img.png"],
        status: input.status,
        description: input.description.trim(),
        ingredients: input.ingredients.trim(),
        keyBenefits: input.keyBenefits.trim(),
        safetyNotes: input.safetyNotes.trim(),
        howToUse: input.howToUse.trim(),
      },
      ...current,
    ]);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((current) =>
      current.filter((product) => product.id !== productId),
    );
    toast.success(productsTable.productDeleted);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-green">{productsTitle}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-dark-green/70">
            {productsDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90"
        >
          {productsTable.addProduct}
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-beige bg-beige/20">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
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
              {products.map((product) => (
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
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      aria-label={`${productsTable.delete} ${product.name}`}
                    >
                      <LuTrash2 className="h-3.5 w-3.5" aria-hidden />
                      {productsTable.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProduct}
      />
    </div>
  );
}
