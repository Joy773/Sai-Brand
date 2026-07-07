import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import ReturnFund from "@/app/components/ReturnFund";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default function ReturnsRefundPage() {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <ReturnFund />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
