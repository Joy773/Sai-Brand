export const KIT_SLUG = "german-care-complete-kit";

export const productSlugs = {
  "anti-chafing-body-cream": "/anti-chafing-main.png",
  "deodorant-roller": "/deodoran-main.png",
  "daily-use-shampoo": "/shampoo-main.png",
  "sunblock-spf-50": "/sunblock-main.png",
} as const;

export type ProductSlug = keyof typeof productSlugs;
export type CatalogSlug = ProductSlug | typeof KIT_SLUG;

export const allProductSlugs: CatalogSlug[] = [
  KIT_SLUG,
  ...Object.keys(productSlugs),
] as CatalogSlug[];

const imageToSlug = Object.fromEntries(
  Object.entries(productSlugs).map(([slug, image]) => [image, slug]),
) as Record<string, ProductSlug>;

export function isCatalogSlug(slug: string): slug is CatalogSlug {
  return slug === KIT_SLUG || slug in productSlugs;
}

export function getSlugFromImage(image: string): ProductSlug | undefined {
  return imageToSlug[image];
}

export function getKitProductTags(items: { tags?: string[] }[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of items) {
    if (!item.tags) continue;

    for (const tag of item.tags) {
      if (!seen.has(tag)) {
        seen.add(tag);
        tags.push(tag);
      }
    }
  }

  return tags;
}
