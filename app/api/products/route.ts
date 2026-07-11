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
  id?: string;
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

function toDetailLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function serializeProduct(
  product: ProductDocument,
  locale: "en" | "de" | "ar" = "en",
) {
  const translations = product.translations!;
  const content = translations[locale] ?? translations.en;
  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : ["/hero-img.png"];

  return {
    id: product._id.toString(),
    name: content.name,
    description: content.description,
    slug: product.slug,
    productType: product.productType ?? "single",
    price: formatPrice(product.price),
    size:
      product.productType === "kit"
        ? product.kitSize
        : `${product.sizeMl} ml`,
    sizeMl: product.sizeMl ?? null,
    kitSize: product.kitSize ?? "",
    image: images[0],
    images,
    status: product.status,
    details: {
      keyBenefits: toDetailLines(content.keyBenefits),
      howToUse: content.howToUse,
      ingredients: content.ingredients,
      safetyNotes: content.safetyNotes,
    },
    translations: {
      en: translations.en,
      de: translations.de,
      ar: translations.ar,
    },
  };
}

function resolveLocale(value: string | null): "en" | "de" | "ar" {
  if (value === "de" || value === "ar") {
    return value;
  }

  return "en";
}

function parseProductPayload(body: CreateProductPayload) {
  const en = sanitizeLocaleContent(body.en);
  const de = sanitizeLocaleContent(body.de);
  const ar = sanitizeLocaleContent(body.ar);

  if (!en || !de || !ar) {
    return {
      ok: false as const,
      error: "English, German, and Arabic product details are required.",
      status: 400,
    };
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
    return {
      ok: false as const,
      error: "Invalid product price.",
      status: 400,
    };
  }

  if (productType === "single") {
    if (Number.isNaN(sizeValue) || sizeValue < 1) {
      return {
        ok: false as const,
        error: "Invalid product size.",
        status: 400,
      };
    }
  } else if (!kitSize) {
    return {
      ok: false as const,
      error: "Kit size description is required.",
      status: 400,
    };
  }

  const status = body.status === "low_stock" ? "low_stock" : "in_stock";

  const rawImages = Array.isArray(body.images) ? body.images : [];
  const images = rawImages
    .map((image) => (typeof image === "string" ? image.trim() : ""))
    .filter((image) => image.length > 0);

  if (images.some((image) => image.startsWith("data:"))) {
    return {
      ok: false as const,
      error: "Product images must be uploaded URLs, not base64 data.",
      status: 400,
    };
  }

  if (
    images.some(
      (image) =>
        !image.startsWith("http://") &&
        !image.startsWith("https://") &&
        !image.startsWith("/"),
    )
  ) {
    return {
      ok: false as const,
      error: "Invalid product image URL.",
      status: 400,
    };
  }

  return {
    ok: true as const,
    data: {
      en,
      de,
      ar,
      productType: productType as "single" | "kit",
      priceValue,
      sizeValue,
      kitSize,
      status: status as "in_stock" | "low_stock",
      productImages: images.length > 0 ? images : ["/hero-img.png"],
    },
  };
}

export async function GET(request: NextRequest) {
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale"));
  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";

  try {
    await connectDB();

    if (slug) {
      const product = await Product.findOne({ slug });

      if (!product) {
        return NextResponse.json(
          { ok: false, error: "Product not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        product: serializeProduct(product, locale),
      });
    }

    const products = await Product.find().sort({ createdAt: -1 });

    return NextResponse.json({
      ok: true,
      products: products.map((product) => serializeProduct(product, locale)),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[products api] Failed to fetch products", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load products." },
      { status: 500 },
    );
  }
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

  const parsed = parseProductPayload(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  const {
    en,
    de,
    ar,
    productType,
    priceValue,
    sizeValue,
    kitSize,
    status,
    productImages,
  } = parsed.data;

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
      images: productImages,
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

export async function PUT(request: NextRequest) {
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

  const productId =
    body.id?.trim() ||
    request.nextUrl.searchParams.get("id")?.trim() ||
    "";

  if (!productId) {
    return NextResponse.json(
      { ok: false, error: "Product id is required." },
      { status: 400 },
    );
  }

  const parsed = parseProductPayload(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  const {
    en,
    de,
    ar,
    productType,
    priceValue,
    sizeValue,
    kitSize,
    status,
    productImages,
  } = parsed.data;

  const slug = slugify(en.name) || `product-${Date.now()}`;

  try {
    await connectDB();

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 },
      );
    }

    const slugConflict = await Product.findOne({
      slug,
      _id: { $ne: productId },
    });
    if (slugConflict) {
      return NextResponse.json(
        { ok: false, error: "A product with this name already exists." },
        { status: 409 },
      );
    }

    existingProduct.slug = slug;
    existingProduct.productType = productType;
    existingProduct.price = priceValue;
    if (productType === "single") {
      existingProduct.sizeMl = sizeValue;
      existingProduct.kitSize = "";
    } else {
      existingProduct.set("sizeMl", undefined);
      existingProduct.kitSize = kitSize;
    }
    existingProduct.status = status;
    existingProduct.images = productImages;
    existingProduct.translations = { en, de, ar };

    await existingProduct.save();

    return NextResponse.json({
      ok: true,
      product: serializeProduct(existingProduct),
    });
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
    console.error("[products api] Failed to update product", error);

    return NextResponse.json(
      { ok: false, error: "Failed to update product. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let productId = request.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (!productId) {
    try {
      const body = (await request.json()) as { id?: string };
      productId = body.id?.trim() ?? "";
    } catch {
      productId = "";
    }
  }

  if (!productId) {
    return NextResponse.json(
      { ok: false, error: "Product id is required." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: deletedProduct._id.toString(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[products api] Failed to delete product", error);

    return NextResponse.json(
      { ok: false, error: "Failed to delete product. Please try again." },
      { status: 500 },
    );
  }
}
