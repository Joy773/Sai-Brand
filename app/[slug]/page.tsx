import { notFound } from "next/navigation";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import ProductDetail from "@/app/components/ProductDetail";
import RelatedProducts from "@/app/components/RelatedProducts";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";
import { connectDB } from "@/app/lib/mongodb";
import Product from "@/app/models/Product";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  await connectDB();
  const productExists = await Product.exists({ slug });

  if (!productExists) {
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
