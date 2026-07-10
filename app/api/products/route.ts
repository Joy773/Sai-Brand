import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import Product, { type ProductDocument } from "@/app/models/Product";

type ProductLocalePayload = {
  name?: string;
  description?: string;
  ingredients?: string;
  keyBenefits?: string;
  safetyNotes?: string;
  howToUse?: string;
};

type CreateProductPayload = {
  productType?: "single" | "kit";
  en?: ProductLocalePayload;
  de?: ProductLocalePayload;
  ar?: ProductLocalePayload;
  price?: string | number;
  sizeMl?: string | number;
  kitSize?: string;
  status?: "in_stock" | "low_stock";
  images?: string[];
};

const localeFields = [
  "name",
  "description",
  "ingredients",
  "keyBenefits",
  "safetyNotes",
  "howToUse",
] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sanitizeLocaleContent(content?: ProductLocalePayload) {
  if (!content) {
    return null;
  }

  const sanitized = {
    name: content.name?.trim() ?? "",
    description: content.description?.trim() ?? "",
    ingredients: content.ingredients?.trim() ?? "",
    keyBenefits: content.keyBenefits?.trim() ?? "",
    safetyNotes: content.safetyNotes?.trim() ?? "",
    howToUse: content.howToUse?.trim() ?? "",
  };

  const isValid = localeFields.every((field) => sanitized[field].length > 0);
  return isValid ? sanitized : null;
}

function formatPrice(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

function serializeProduct(product: ProductDocument) {
  const translations = product.translations!;

  return {
    id: product._id.toString(),
    name: translations.en.name,
    slug: product.slug,
    productType: product.productType,
    price: formatPrice(product.price),
    size:
      product.productType === "kit"
        ? product.kitSize
        : `${product.sizeMl} ml`,
    sizeMl: product.sizeMl ?? null,
    kitSize: product.kitSize ?? "",
    images: product.images,
    status: product.status,
    translations: {
      en: translations.en,
      de: translations.de,
      ar: translations.ar,
    },
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: CreateProductPayload;

  try {
    body = (await request.json()) as CreateProductPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const en = sanitizeLocaleContent(body.en);
  const de = sanitizeLocaleContent(body.de);
  const ar = sanitizeLocaleContent(body.ar);

  if (!en || !de || !ar) {
    return NextResponse.json(
      {
        ok: false,
        error: "English, German, and Arabic product details are required.",
      },
      { status: 400 },
    );
  }

  const priceValue =
    typeof body.price === "number"
      ? body.price
      : Number.parseFloat(String(body.price ?? ""));

  const productType = body.productType === "kit" ? "kit" : "single";
  const kitSize = body.kitSize?.trim() ?? "";
  const sizeValue =
    typeof body.sizeMl === "number"
      ? body.sizeMl
      : Number.parseInt(String(body.sizeMl ?? ""), 10);

  if (Number.isNaN(priceValue) || priceValue < 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid product price." },
      { status: 400 },
    );
  }

  if (productType === "single") {
    if (Number.isNaN(sizeValue) || sizeValue < 1) {
      return NextResponse.json(
        { ok: false, error: "Invalid product size." },
        { status: 400 },
      );
    }
  } else if (!kitSize) {
    return NextResponse.json(
      { ok: false, error: "Kit size description is required." },
      { status: 400 },
    );
  }

  const status = body.status === "low_stock" ? "low_stock" : "in_stock";
  const images =
    Array.isArray(body.images) && body.images.length > 0
      ? body.images
      : ["/hero-img.png"];

  const slug = slugify(en.name) || `product-${Date.now()}`;

  try {
    await connectDB();

    const existingProduct = await Product.findOne({ slug });
    if (existingProduct) {
      return NextResponse.json(
        { ok: false, error: "A product with this name already exists." },
        { status: 409 },
      );
    }

    const product = await Product.create({
      slug,
      productType,
      price: priceValue,
      sizeMl: productType === "single" ? sizeValue : undefined,
      kitSize: productType === "kit" ? kitSize : "",
      status,
      images,
      translations: { en, de, ar },
    });

    return NextResponse.json(
      {
        ok: true,
        product: serializeProduct(product),
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { ok: false, error: "A product with this slug already exists." },
        { status: 409 },
      );
    }

    // eslint-disable-next-line no-console
    console.error("[products api] Failed to create product", error);

    return NextResponse.json(
      { ok: false, error: "Failed to save product. Please try again." },
      { status: 500 },
    );
  }
}
