export function scrollToHash(href: string) {
  if (!href.startsWith("#") || href === "#") return;

  const target = document.getElementById(href.slice(1));
  if (!target) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  target.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });

  window.history.pushState(null, "", href);
}

export function handleSectionClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onAfterClick?: () => void,
) {
  if (!href.startsWith("#") || href === "#") return;

  event.preventDefault();
  scrollToHash(href);
  onAfterClick?.();
}
