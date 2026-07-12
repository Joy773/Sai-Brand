function trimTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

export const SITE_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "https://www.german-care.com",
);
