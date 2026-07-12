import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import TrustStrip from "@/app/components/TrustStrip";
import VerifyEmailInvalid from "@/app/components/VerifyEmailInvalid";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default function VerifyEmailPage() {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <VerifyEmailInvalid />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
