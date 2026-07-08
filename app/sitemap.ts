import type { MetadataRoute } from "next";
import { allProductSlugs } from "@/app/lib/products";
import { SITE_URL } from "@/app/lib/site";

const legalPages = [
  "/privacy-policy",
  "/terms-and-conditions",
  "/shipping-delivery",
  "/returns-refunds",
  "/withdrawal-policy",
  "/legal-notice",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...allProductSlugs.map((slug) => ({
      url: `${SITE_URL}/${slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...legalPages.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
