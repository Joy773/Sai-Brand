import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import PrivacyPolicy from "@/app/components/PrivacyPolicy";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default function PrivacyPolicyPage() {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <PrivacyPolicy />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
