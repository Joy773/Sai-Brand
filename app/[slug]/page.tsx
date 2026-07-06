import { notFound } from "next/navigation";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import ProductDetail from "@/app/components/ProductDetail";
import RelatedProducts from "@/app/components/RelatedProducts";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";
import { allProductSlugs, isCatalogSlug } from "@/app/lib/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return allProductSlugs.map((slug) => ({ slug }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  if (!isCatalogSlug(slug)) {
    notFound();
  }

  return (
    <LocaleProvider>
      <CookieConsentProvider>
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
