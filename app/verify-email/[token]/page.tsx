import { v4 as uuidv4 } from "uuid";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import TrustStrip from "@/app/components/TrustStrip";
import VerifyEmailInvalid from "@/app/components/VerifyEmailInvalid";
import VerifyEmailSuccess from "@/app/components/VerifyEmailSuccess";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";
import { connectDB } from "@/app/lib/mongodb";
import User from "@/app/models/User";

type VerifyEmailPageProps = {
  params: Promise<{ token: string }>;
};

export default async function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const { token } = await params;

  await connectDB();

  const user = await User.findOne({
    verificationToken: token,
  });

  let email = "";
  let autoLoginToken = "";
  let isValid = false;

  if (user) {
    autoLoginToken = uuidv4();
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.autoLoginToken = autoLoginToken;
    await user.save();
    email = user.email;
    isValid = true;
  }

  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="flex min-h-screen flex-col bg-warm-white text-dark-green">
          <Navbar />
          <TrustStrip />
          {isValid ? (
            <VerifyEmailSuccess email={email} autoLoginToken={autoLoginToken} />
          ) : (
            <VerifyEmailInvalid />
          )}
          <Footer />
        </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
