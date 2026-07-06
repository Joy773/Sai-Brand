import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import PrivacyPolicyDetails from "@/app/components/PrivacyPolicyDetails";
import PrivacyPolicyHero from "@/app/components/PrivacyPolicyHero";
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
          <PrivacyPolicyHero />
          <PrivacyPolicyDetails />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
