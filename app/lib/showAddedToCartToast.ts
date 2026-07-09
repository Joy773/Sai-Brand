"use client";

import { toast } from "sonner";

export function showAddedToCartToast(message: string) {
  toast.success(message);
}

export function showRemovedFromCartToast(message: string) {
  toast.success(message);
}
