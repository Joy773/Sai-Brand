import ConditionDetails from "@/app/components/ConditionDetails";
import ConditionHero from "@/app/components/ConditionHero";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default function TermsConditionsPage() {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <ConditionHero />
          <ConditionDetails />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
