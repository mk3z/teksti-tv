import { getItem, setItem } from "./storage.js";
import { LANGUAGES } from "./i18n.js";

const THEMES = ["auto", "light", "dark"];
const darkSchemeQuery = matchMedia("(prefers-color-scheme: dark)");

export const ZOOM_MIN = 60;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 20;
export const ZOOM_DEFAULT = 100;

function applyTheme(theme) {
  const resolved = theme === "auto" ? (darkSchemeQuery.matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = surfaceColor;
}

export function getTheme() {
  const theme = getItem("theme", "auto");
  return THEMES.includes(theme) ? theme : "auto";
}

export function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  setItem("theme", theme);
  applyTheme(theme);
}

export function getLanguage() {
  const lang = getItem("language", "fi");
  return LANGUAGES.includes(lang) ? lang : "fi";
}

export function setLanguage(lang) {
  if (!LANGUAGES.includes(lang)) return;
  setItem("language", lang);
}

export function initTheme() {
  applyTheme(getTheme());
  darkSchemeQuery.addEventListener("change", () => {
    if (getTheme() === "auto") applyTheme("auto");
  });
}

function applyZoom(zoom) {
  document.documentElement.style.setProperty("--zoom", zoom / 100);
}

function clampZoom(zoom) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function getZoom() {
  const zoom = getItem("zoom", ZOOM_DEFAULT);
  return typeof zoom === "number" ? clampZoom(zoom) : ZOOM_DEFAULT;
}

export function setZoom(zoom) {
  const clamped = clampZoom(zoom);
  setItem("zoom", clamped);
  applyZoom(clamped);
}

export function initZoom() {
  applyZoom(getZoom());
}
