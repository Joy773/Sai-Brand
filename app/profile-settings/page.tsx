import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import ProfileInformation from "@/app/components/ProfileInformation";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default function ProfileSettingsPage() {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 lg:px-8">
            <ProfileInformation />
          </main>
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
