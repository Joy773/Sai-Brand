"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!w-fit !min-w-0 !max-w-[calc(100vw-2rem)] !bg-dark-green !text-warm-white !border-beige/50 shadow-lg shadow-dark-green/20",
          title: "!text-warm-white font-semibold whitespace-nowrap",
          description: "!text-warm-white/80",
          success: "!bg-dark-green !text-warm-white !border-gold/50",
          closeButton:
            "!bg-warm-white/10 !border-beige/50 !text-warm-white hover:!bg-warm-white/20",
        },
      }}
    />
  );
}
