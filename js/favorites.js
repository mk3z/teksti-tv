import { getItem, setItem } from "./storage.js";

const STORAGE_KEY = "favorites";

export function getFavorites() {
  const stored = getItem(STORAGE_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((favorite) => typeof favorite?.page === "string" && /^[1-8]\d\d$/.test(favorite.page))
    .map((favorite) => ({ page: favorite.page, name: typeof favorite.name === "string" ? favorite.name : "" }));
}

export function isFavorite(pageNumber) {
  return getFavorites().some((favorite) => favorite.page === pageNumber);
}

export function toggleFavorite(pageNumber, pageName) {
  const favorites = getFavorites();
  const index = favorites.findIndex((favorite) => favorite.page === pageNumber);
  if (index === -1) favorites.push({ page: pageNumber, name: pageName || "" });
  else favorites.splice(index, 1);
  setItem(STORAGE_KEY, favorites);
}
