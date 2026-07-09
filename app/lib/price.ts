export function parsePrice(price: string): number {
  const normalized = price.replace(/[^\d.,-]/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function formatPrice(amount: number, referencePrice: string): string {
  if (referencePrice.includes("€")) {
    return `€${amount.toFixed(2)}`;
  }

  return amount.toFixed(2);
}
