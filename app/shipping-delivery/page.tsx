import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import ShippingDeliveryDetails from "@/app/components/ShippingDeliveryDetails";
import ShippingDeliveryHero from "@/app/components/ShippingDeliveryHero";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default function ShippingDeliveryPage() {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <ShippingDeliveryHero />
          <ShippingDeliveryDetails />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
