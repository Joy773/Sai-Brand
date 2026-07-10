import { redirect } from "next/navigation";
import Cart from "@/app/components/Cart";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import TrustStrip from "@/app/components/TrustStrip";
import { auth } from "@/app/auth";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default async function CartPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/?callbackUrl=/cart");
  }

  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          <Cart />
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
