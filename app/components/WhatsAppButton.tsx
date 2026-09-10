"use client";

import { FaWhatsapp } from "react-icons/fa";
import { usePathname } from "next/navigation";

const WHATSAPP_MESSAGE =
  "Hello! 👋 I’m interested in your products and would like to know more about your offerings. Could you please provide me with some details?";

type WhatsAppButtonProps = {
  /** Digits only with country code, e.g. "8801749804081". */
  phone?: string;
  /** Visible button label (ignored when floating). */
  label?: string;
  className?: string;
  /** Hide the WhatsApp icon. */
  hideIcon?: boolean;
  /**
   * Fixed bottom-end floating action button for every storefront page.
   * Hidden automatically on `/admin` routes.
   */
  floating?: boolean;
};

function buildWhatsAppUrl(phone: string) {
  const normalizedPhone = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}

export default function WhatsAppButton({
  phone,
  label = "WhatsApp",
  className = "",
  hideIcon = false,
  floating = false,
}: WhatsAppButtonProps) {
  const pathname = usePathname();
  const resolvedPhone = phone?.trim() || "";

  if (!resolvedPhone) {
    return null;
  }

  if (floating && pathname?.startsWith("/admin")) {
    return null;
  }

  const href = buildWhatsAppUrl(resolvedPhone);

  if (floating) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={`fixed bottom-5 end-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#1ebe57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] sm:bottom-6 sm:end-6 sm:h-16 sm:w-16 ${className}`}
      >
        <FaWhatsapp className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe57] ${className}`}
    >
      {!hideIcon ? (
        <FaWhatsapp className="h-5 w-5 shrink-0" aria-hidden />
      ) : null}
      <span>{label}</span>
    </a>
  );
}
