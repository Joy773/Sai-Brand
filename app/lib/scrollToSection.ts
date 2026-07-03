export function scrollToHash(href: string) {
  if (!href.startsWith("#") || href === "#") return false;

  const target = document.getElementById(href.slice(1));
  if (!target) return false;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  target.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });

  window.history.pushState(null, "", href);
  return true;
}

export function handleSectionClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onAfterClick?: () => void,
) {
  if (!href.startsWith("#") || href === "#") return;

  event.preventDefault();
  const didScroll = scrollToHash(href);
  onAfterClick?.();

  if (!didScroll) {
    window.location.href = `/${href}`;
  }
}
