export type ProductMediaItem = {
  type: "image" | "video";
  url: string;
};

export function buildProductMedia(
  images: string[] = [],
  videos: string[] = [],
): ProductMediaItem[] {
  const imageItems = images
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ type: "image" as const, url }));

  const videoItems = videos
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ type: "video" as const, url }));

  if (imageItems.length === 0 && videoItems.length === 0) {
    return [{ type: "image", url: "/hero-img.png" }];
  }

  return [...imageItems, ...videoItems];
}

export function getCartImageFromMedia(
  media: ProductMediaItem[],
  activeIndex: number,
  fallback = "/hero-img.png",
) {
  const active = media[activeIndex];
  if (active?.type === "image") {
    return active.url;
  }

  const firstImage = media.find((item) => item.type === "image");
  return firstImage?.url ?? fallback;
}
