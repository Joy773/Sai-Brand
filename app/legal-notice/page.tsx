import Footer from "@/app/components/Footer";
import LegalNotice from "@/app/components/LegalNotice";
import Navbar from "@/app/components/Navbar";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default function LegalNoticePage() {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <LegalNotice />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
