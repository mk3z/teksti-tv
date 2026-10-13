const DEFAULT_PAGE = "100";

function parseHash(hash) {
  const match = hash.replace(/^#/, "").match(/^[1-8]\d\d$/);
  return { page: match ? match[0] : DEFAULT_PAGE };
}

export function currentRoute() {
  return parseHash(location.hash);
}

export function navigate(page) {
  const hash = `#${page}`;
  if (hash === location.hash) return;
  location.hash = hash;
}

export function onRouteChange(onChange) {
  addEventListener("hashchange", () => onChange(currentRoute()));
}
