import CTA from "@/app/components/CTA";
import FAQ from "@/app/components/FAQ";
import Footer from "@/app/components/Footer";
import Hero from "@/app/components/Hero";
import Navbar from "@/app/components/Navbar";
import TrustStrip from "@/app/components/TrustStrip";
import Products from "@/app/components/Products";
import ScrollOnReveal from "@/app/components/ScrollOnReveal";
import TrustBatch from "@/app/components/TrustBatch";
import WhySai from "@/app/components/OurStory";
import { CookieConsentProvider } from "@/app/i18n/CookieConsentProvider";
import { LocaleProvider } from "@/app/i18n/LocaleProvider";

export default function Home() {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <div className="min-h-screen bg-warm-white text-dark-green">
        <Navbar />
        <TrustStrip />

        <Hero />
        <ScrollOnReveal>
          <TrustBatch />
        </ScrollOnReveal>
        <ScrollOnReveal delay={100}>
          <Products />
        </ScrollOnReveal>
        <ScrollOnReveal delay={100}>
          <WhySai />
        </ScrollOnReveal>
        <ScrollOnReveal delay={100}>
          <FAQ />
        </ScrollOnReveal>
        <ScrollOnReveal delay={100}>
          <CTA />
        </ScrollOnReveal>
        <ScrollOnReveal delay={100}>
          <Footer />
        </ScrollOnReveal>
      </div>
      </CookieConsentProvider>
    </LocaleProvider>
  );
}
