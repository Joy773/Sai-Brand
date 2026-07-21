import { connectDB } from "@/app/lib/mongodb";
import Product from "@/app/models/Product";
import ShippingRate from "@/app/models/ShippingRate";

export const MAX_ORDER_QUANTITY = 20;

export type PricingProductInput = {
  slug?: string;
  name?: string;
  image?: string;
  quantity?: number;
};

export type ResolvedOrderProduct = {
  slug: string;
  name: string;
  price: string;
  unitPrice: number;
  image: string;
  quantity: number;
  lineTotal: number;
};

export type OrderPricingSuccess = {
  ok: true;
  products: ResolvedOrderProduct[];
  productsTotal: number;
  shippingFee: number;
  total: number;
  country: string;
};

export type OrderPricingError = {
  ok: false;
  error: string;
  status: number;
};

export type OrderPricingResult = OrderPricingSuccess | OrderPricingError;

function formatEuro(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Resolves authoritative order pricing from the database.
 *
 * Client-supplied prices are never trusted: unit prices come from the Product
 * collection and the shipping fee comes from the ShippingRate collection. This
 * prevents amount tampering during checkout/payment.
 */
export async function resolveOrderPricing(input: {
  products?: PricingProductInput[];
  country?: string;
}): Promise<OrderPricingResult> {
  const rawProducts = input.products;
  const country = input.country?.trim() ?? "";

  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    return {
      ok: false,
      error: "At least one product is required.",
      status: 400,
    };
  }

  if (!country) {
    return { ok: false, error: "Delivery country is required.", status: 400 };
  }

  const requested: Array<{
    slug: string;
    name: string;
    image: string;
    quantity: number;
  }> = [];

  for (const product of rawProducts) {
    const slug = typeof product.slug === "string" ? product.slug.trim() : "";
    const quantity = product.quantity;

    if (!slug) {
      return { ok: false, error: "Invalid product data.", status: 400 };
    }

    if (
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ORDER_QUANTITY
    ) {
      return { ok: false, error: "Invalid product quantity.", status: 400 };
    }

    requested.push({
      slug,
      name: typeof product.name === "string" ? product.name.trim() : "",
      image: typeof product.image === "string" ? product.image.trim() : "",
      quantity,
    });
  }

  await connectDB();

  const slugs = [...new Set(requested.map((item) => item.slug))];
  const dbProducts = await Product.find({ slug: { $in: slugs } })
    .select("slug price images translations")
    .lean();

  const bySlug = new Map(dbProducts.map((product) => [product.slug, product]));

  const resolved: ResolvedOrderProduct[] = [];
  let productsTotal = 0;

  for (const item of requested) {
    const dbProduct = bySlug.get(item.slug);

    if (!dbProduct) {
      return {
        ok: false,
        error: `Product "${item.slug}" is no longer available.`,
        status: 400,
      };
    }

    const unitPrice =
      typeof dbProduct.price === "number" ? dbProduct.price : Number.NaN;

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { ok: false, error: "Invalid product price.", status: 400 };
    }

    const lineTotal = roundMoney(unitPrice * item.quantity);
    productsTotal += lineTotal;

    const dbImage =
      Array.isArray(dbProduct.images) && dbProduct.images.length > 0
        ? dbProduct.images[0]
        : "";
    const dbName = dbProduct.translations?.en?.name ?? "";

    resolved.push({
      slug: item.slug,
      name: item.name || dbName,
      price: formatEuro(unitPrice),
      unitPrice,
      image: item.image || dbImage,
      quantity: item.quantity,
      lineTotal,
    });
  }

  const shippingRate = await ShippingRate.findOne({
    country,
    enabled: true,
  }).lean();

  if (!shippingRate) {
    return {
      ok: false,
      error: "Shipping is not available for the selected country.",
      status: 400,
    };
  }

  const shippingFee =
    typeof shippingRate.price === "number" && shippingRate.price >= 0
      ? shippingRate.price
      : 0;

  productsTotal = roundMoney(productsTotal);
  const total = roundMoney(productsTotal + shippingFee);

  return {
    ok: true,
    products: resolved,
    productsTotal,
    shippingFee,
    total,
    country,
  };
}
