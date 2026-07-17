import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import ProductDetail from "@/app/components/ProductDetail";
import RelatedProducts from "@/app/components/RelatedProducts";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";
import {
  isLocale,
  LOCALE_COOKIE_KEY,
  type Locale,
} from "@/app/i18n/locales";
import { connectDB } from "@/app/lib/mongodb";
import { SITE_URL } from "@/app/lib/site";
import Product from "@/app/models/Product";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;

const metadataCopy: Record<
  Locale,
  {
    brandTitle: string;
    notFoundTitle: string;
    descriptionSuffix: string;
    openGraphBrand: string;
  }
> = {
  en: {
    brandTitle: "sa’i Hajj & Umrah Care | German Care",
    notFoundTitle: "Product Not Found | sa’i Hajj & Umrah Care | German Care",
    descriptionSuffix:
      "Designed for Hajj and Umrah pilgrims with Ihram-safe personal care essentials.",
    openGraphBrand: "sa’i German Care",
  },
  de: {
    brandTitle: "sa’i Hadsch & Umra Pflege | German Care",
    notFoundTitle:
      "Produkt nicht gefunden | sa’i Hadsch & Umra Pflege | German Care",
    descriptionSuffix:
      "Entwickelt für Hadsch- und Umra-Pilger mit Ihram-sicheren Körperpflege-Essentials.",
    openGraphBrand: "sa’i German Care",
  },
  ar: {
    brandTitle: "sa’i للعناية في الحج والعمرة | German Care",
    notFoundTitle:
      "المنتج غير موجود | sa’i للعناية في الحج والعمرة | German Care",
    descriptionSuffix:
      "مصمم لضيوف الرحمن في الحج والعمرة مع مستلزمات عناية شخصية آمنة للإحرام.",
    openGraphBrand: "sa’i German Care",
  },
};

const sharedKeywords = [
  "Hajj and Umrah kit",
  "Hajj kit",
  "Umrah kit",
  "Hajj travel kit",
  "Umrah travel kit",
  "Hajj essentials",
  "Umrah essentials",
  "Pilgrim care kit",
  "Hajj hygiene kit",
  "Umrah hygiene kit",
  "Hadsch und Umra Set",
  "Hadsch Set",
  "Umra Set",
  "Pilgerpflege",
  "حقيبة الحج والعمرة",
  "طقم الحج",
  "طقم العمرة",
  "مستلزمات الحج",
  "مستلزمات العمرة",
];

const openGraphLocale: Record<Locale, string> = {
  en: "en_US",
  de: "de_DE",
  ar: "ar_SA",
};

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = (await headers()).get("accept-language")?.toLowerCase();

  if (acceptLanguage?.includes("ar")) {
    return "ar";
  }

  if (acceptLanguage?.includes("de")) {
    return "de";
  }

  return "en";
}

async function getProductBySlug(slug: string, locale: Locale) {
  await connectDB();

  const product = await Product.findOne({ slug }).lean();

  if (!product) {
    return null;
  }

  const translations = product.translations;
  const content =
    translations?.[locale] ??
    translations?.en ?? {
      name: slug,
      description: "",
    };

  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : ["/hero-img.png"];

  return {
    name: content.name,
    description: content.description,
    image: images[0],
    price: product.price,
    status: product.status ?? "in_stock",
  };
}

function buildProductJsonLd(
  slug: string,
  product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>,
) {
  const imageUrl = product.image.startsWith("http")
    ? product.image
    : `${SITE_URL}${product.image}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: [imageUrl],
    sku: slug,
    brand: {
      "@type": "Brand",
      name: "German Care",
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/${slug}`,
      priceCurrency: "EUR",
      price: product.price.toFixed(2),
      availability:
        product.status === "low_stock"
          ? "https://schema.org/LimitedAvailability"
          : "https://schema.org/InStock",
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveLocale();
  const copy = metadataCopy[locale];
  const product = await getProductBySlug(slug, locale);

  if (!product) {
    return {
      title: copy.notFoundTitle,
    };
  }

  const title = `${product.name} | ${copy.brandTitle}`;
  const description = `${product.description} ${copy.descriptionSuffix}`;

  return {
    title,
    description,
    keywords: sharedKeywords,
    alternates: {
      canonical: `${SITE_URL}/${slug}`,
      languages: {
        en: `${SITE_URL}/${slug}`,
        de: `${SITE_URL}/${slug}`,
        ar: `${SITE_URL}/${slug}`,
        "x-default": `${SITE_URL}/${slug}`,
      },
    },
    openGraph: {
      title: `${product.name} | ${copy.openGraphBrand}`,
      description: product.description,
      locale: openGraphLocale[locale],
      alternateLocale: Object.values(openGraphLocale).filter(
        (value) => value !== openGraphLocale[locale],
      ),
      images: [
        {
          url: product.image,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const locale = await resolveLocale();

  const product = await getProductBySlug(slug, locale);

  if (!product) {
    notFound();
  }

  const productJsonLd = buildProductJsonLd(slug, product);

  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <ProductDetail slug={slug} />
          <RelatedProducts slug={slug} />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
