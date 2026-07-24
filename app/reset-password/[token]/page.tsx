import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import ResetPasswordForm from "@/app/components/ResetPasswordForm";
import TrustStrip from "@/app/components/TrustStrip";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

type ResetPasswordPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps) {
  const { token } = await params;

  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <ResetPasswordForm token={token} />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
