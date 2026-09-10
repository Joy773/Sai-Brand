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
  unitPriceCents: number;
  image: string;
  quantity: number;
  lineTotal: number;
  lineTotalCents: number;
};

export type OrderPricingSuccess = {
  ok: true;
  products: ResolvedOrderProduct[];
  productsTotal: number;
  productsTotalCents: number;
  shippingFee: number;
  shippingFeeCents: number;
  total: number;
  totalCents: number;
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

export function toCents(value: number) {
  return Math.round(value * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

export function amountsMatch(left: number, right: number) {
  return Math.abs(left - right) <= 0.01;
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
    .select("slug price discountPrice images translations")
    .lean();

  const bySlug = new Map(dbProducts.map((product) => [product.slug, product]));

  const resolved: ResolvedOrderProduct[] = [];
  let productsTotalCents = 0;

  for (const item of requested) {
    const dbProduct = bySlug.get(item.slug);

    if (!dbProduct) {
      return {
        ok: false,
        error: `Product "${item.slug}" is no longer available.`,
        status: 400,
      };
    }

    const listPrice =
      typeof dbProduct.price === "number" ? dbProduct.price : Number.NaN;

    if (!Number.isFinite(listPrice) || listPrice < 0) {
      return { ok: false, error: "Invalid product price.", status: 400 };
    }

    // Must mirror getEffectivePrice() in ProductPrice.tsx: the storefront carts
    // the discount price when one is set, so checkout has to charge the same.
    const discountPrice = dbProduct.discountPrice;
    const unitPrice =
      typeof discountPrice === "number" &&
      Number.isFinite(discountPrice) &&
      discountPrice >= 0
        ? discountPrice
        : listPrice;

    // Round per unit first, then multiply. PayPal/Stripe both total
    // unit_amount (cents) * quantity, so this must match that.
    const unitPriceCents = toCents(unitPrice);
    const lineTotalCents = unitPriceCents * item.quantity;
    productsTotalCents += lineTotalCents;

    const dbImage =
      Array.isArray(dbProduct.images) && dbProduct.images.length > 0
        ? dbProduct.images[0]
        : "";
    const dbName = dbProduct.translations?.en?.name ?? "";
    const unitPriceExact = fromCents(unitPriceCents);

    resolved.push({
      slug: item.slug,
      name: item.name || dbName,
      price: formatEuro(unitPriceExact),
      unitPrice: unitPriceExact,
      unitPriceCents,
      image: item.image || dbImage,
      quantity: item.quantity,
      lineTotal: fromCents(lineTotalCents),
      lineTotalCents,
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

  const shippingFeeCents = toCents(shippingFee);
  const totalCents = productsTotalCents + shippingFeeCents;

  return {
    ok: true,
    products: resolved,
    productsTotal: fromCents(productsTotalCents),
    productsTotalCents,
    shippingFee: fromCents(shippingFeeCents),
    shippingFeeCents,
    total: fromCents(totalCents),
    totalCents,
    country,
  };
}
