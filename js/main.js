import { fetchPage, PageNotFoundError } from "./api.js";
import { renderPage, relabelPage } from "./viewer.js";
import { currentRoute, navigate, onRouteChange } from "./router.js";
import { t } from "./i18n.js";
import { getFavorites, isFavorite, toggleFavorite } from "./favorites.js";
import {
  getTheme,
  setTheme,
  getLanguage,
  setLanguage,
  initTheme,
  getZoom,
  setZoom,
  initZoom,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  ZOOM_DEFAULT,
} from "./settings.js";

const PAGE_NUMBER = /^[1-8]\d\d$/;

const viewerEl = document.getElementById("viewer");
const statusEl = document.getElementById("status");
const gotoForm = document.getElementById("goto-form");
const gotoInput = document.getElementById("goto-input");
const prevPageButton = document.getElementById("prev-page-button");
const nextPageButton = document.getElementById("next-page-button");
const refreshButton = document.getElementById("refresh-button");
const favoriteButton = document.getElementById("favorite-button");
const topbarEl = document.getElementById("topbar");
const bottombarEl = document.getElementById("bottombar");
const bookmarksRowEl = document.getElementById("bookmarks-row");
const bookmarksEl = document.getElementById("bookmarks");
const bookmarksMenuButton = document.getElementById("bookmarks-menu-button");
const bookmarksMenuEl = document.getElementById("bookmarks-menu");
const zoomOutButton = document.getElementById("zoom-out-button");
const zoomInButton = document.getElementById("zoom-in-button");
const zoomResetButton = document.getElementById("zoom-reset-button");
const settingsButton = document.getElementById("settings-button");
const settingsDialog = document.getElementById("settings-dialog");
const languageOptions = document.getElementById("language-options");
const themeOptions = document.getElementById("theme-options");
const settingsCloseButton = document.getElementById("settings-close-button");

let lang = getLanguage();
let shownPage = null;
let statusKey = null;
let latestRequest = 0;

function applyLanguage() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(lang, el.dataset.i18n);
  }
  gotoInput.setAttribute("aria-label", t(lang, "goToPage"));
  refreshButton.setAttribute("aria-label", t(lang, "refresh"));
  zoomOutButton.setAttribute("aria-label", t(lang, "zoomOut"));
  zoomInButton.setAttribute("aria-label", t(lang, "zoomIn"));
  zoomResetButton.setAttribute("aria-label", t(lang, "zoomReset"));
  bookmarksMenuButton.setAttribute("aria-label", t(lang, "favoritesMenu"));
  settingsButton.setAttribute("aria-label", t(lang, "settings"));
  settingsCloseButton.setAttribute("aria-label", t(lang, "close"));
  prevPageButton.setAttribute("aria-label", t(lang, "prevPage"));
  nextPageButton.setAttribute("aria-label", t(lang, "nextPage"));
  for (const btn of languageOptions.children) {
    btn.setAttribute("aria-pressed", String(btn.dataset.value === lang));
  }
  updateFavoriteButton();
  if (shownPage) relabelPage(viewerEl, shownPage, lang);
  if (statusKey) statusEl.textContent = t(lang, statusKey);
}

function applyThemeOptionState() {
  const theme = getTheme();
  for (const btn of themeOptions.children) {
    btn.setAttribute("aria-pressed", String(btn.dataset.value === theme));
  }
}

function updateZoomButtons() {
  const zoom = getZoom();
  zoomOutButton.disabled = zoom <= ZOOM_MIN;
  zoomInButton.disabled = zoom >= ZOOM_MAX;
  zoomResetButton.textContent = `${zoom}%`;
  zoomResetButton.disabled = zoom === ZOOM_DEFAULT;
}

function updateFavoriteButton() {
  const favorited = shownPage ? isFavorite(shownPage.pageNumber) : false;
  favoriteButton.textContent = favorited ? "★" : "☆";
  favoriteButton.setAttribute("aria-pressed", String(favorited));
  favoriteButton.setAttribute("aria-label", t(lang, favorited ? "removeFavorite" : "addFavorite"));
}

function favoriteLink(favorite, linkClass, nameClass) {
  const a = document.createElement("a");
  a.className = linkClass;
  a.href = `#${favorite.page}`;
  a.dataset.page = favorite.page;
  a.append(favorite.page);
  if (favorite.name) {
    const nameEl = document.createElement("span");
    nameEl.className = nameClass;
    nameEl.textContent = favorite.name;
    a.append(" ", nameEl);
  }
  return a;
}

function renderBookmarks() {
  const favorites = getFavorites();
  bookmarksRowEl.hidden = favorites.length === 0;
  bookmarksEl.replaceChildren(
    ...favorites.map((favorite) => favoriteLink(favorite, "bookmarks__chip", "bookmarks__chip-name")),
  );

  bookmarksMenuButton.hidden = true;
  if (hideOverflowingChips() > 0) {
    bookmarksMenuButton.hidden = false;
    hideOverflowingChips();
  }

  const overflowing = favorites.filter((_, i) => bookmarksEl.children[i].hidden);
  bookmarksMenuEl.replaceChildren(
    ...overflowing.map((favorite) => favoriteLink(favorite, "bookmarks-menu__item", "bookmarks-menu__item-name")),
  );
  if (bookmarksMenuEl.matches(":popover-open")) {
    if (overflowing.length === 0) bookmarksMenuEl.hidePopover();
    else positionBookmarksMenu();
  }
  updateBookmarksHighlight();
}

function hideOverflowingChips() {
  const chips = [...bookmarksEl.children];
  for (const chip of chips) chip.hidden = false;
  const rowWidth = bookmarksEl.clientWidth;
  const firstOverflowing = chips.findIndex((chip) => chip.offsetLeft + chip.offsetWidth > rowWidth);
  if (firstOverflowing === -1) return 0;
  for (const chip of chips.slice(firstOverflowing)) chip.hidden = true;
  return chips.length - firstOverflowing;
}

function updateBookmarksHighlight() {
  const current = currentRoute().page;
  for (const el of [...bookmarksEl.children, ...bookmarksMenuEl.children]) {
    if (el.dataset.page === current) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
}

function positionBookmarksMenu() {
  const margin = 8;
  const button = bookmarksMenuButton.getBoundingClientRect();
  bookmarksMenuEl.style.maxHeight = "";
  const menuWidth = bookmarksMenuEl.offsetWidth;
  const menuHeight = bookmarksMenuEl.offsetHeight;
  const spaceBelow = innerHeight - button.bottom - 2 * margin;
  const spaceAbove = button.top - 2 * margin;
  const below = menuHeight <= spaceBelow || spaceBelow >= spaceAbove;
  const height = Math.min(menuHeight, below ? spaceBelow : spaceAbove);

  bookmarksMenuEl.style.left = `${Math.max(margin, Math.min(button.right - menuWidth, innerWidth - menuWidth - margin))}px`;
  bookmarksMenuEl.style.top = `${below ? button.bottom + margin : button.top - margin - height}px`;
  bookmarksMenuEl.style.maxHeight = `${height}px`;
}

bookmarksMenuEl.addEventListener("beforetoggle", (e) => {
  if (e.newState === "open") {
    requestAnimationFrame(positionBookmarksMenu);
    addEventListener("resize", positionBookmarksMenu);
  } else {
    removeEventListener("resize", positionBookmarksMenu);
  }
});

bookmarksMenuEl.addEventListener("click", (e) => {
  if (e.target.closest("a")) bookmarksMenuEl.hidePopover();
});

const narrowLayout = matchMedia("(width < 720px)");
function placeBookmarksRow() {
  if (narrowLayout.matches) {
    if (bookmarksRowEl.nextElementSibling !== bottombarEl) bottombarEl.before(bookmarksRowEl);
  } else if (bookmarksRowEl.parentElement !== topbarEl) {
    topbarEl.prepend(bookmarksRowEl);
  }
}

let lastWindowWidth = innerWidth;
addEventListener("resize", () => {
  if (innerWidth === lastWindowWidth) return;
  lastWindowWidth = innerWidth;
  placeBookmarksRow();
  renderBookmarks();
});

function showStatus(key) {
  statusKey = key;
  statusEl.textContent = t(lang, key);
  statusEl.hidden = false;
  viewerEl.hidden = true;
}

function hideStatus() {
  statusKey = null;
  statusEl.hidden = true;
  viewerEl.hidden = false;
}

function updateControls() {
  prevPageButton.disabled = !shownPage.prevPage;
  nextPageButton.disabled = !shownPage.nextPage;
  gotoInput.value = shownPage.pageNumber;
}

async function loadRoute(route) {
  const request = ++latestRequest;
  updateBookmarksHighlight();

  try {
    const loaded = await fetchPage(route.page);
    if (request !== latestRequest) return;
    shownPage = loaded;
    updateControls();
    favoriteButton.disabled = false;
    updateFavoriteButton();
    renderPage(viewerEl, shownPage, lang);
    hideStatus();
  } catch (err) {
    if (request !== latestRequest) return;
    favoriteButton.disabled = true;
    showStatus(err instanceof PageNotFoundError ? "notFound" : "loadError");
  }
}

gotoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (PAGE_NUMBER.test(gotoInput.value)) navigate(gotoInput.value);
  gotoInput.blur();
});

gotoInput.addEventListener("focus", () => gotoInput.select());
gotoInput.addEventListener("input", () => {
  gotoInput.value = gotoInput.value.replace(/\D/g, "");
  if (PAGE_NUMBER.test(gotoInput.value)) {
    navigate(gotoInput.value);
    gotoInput.blur();
  }
});
gotoInput.addEventListener("blur", () => {
  if (shownPage && !PAGE_NUMBER.test(gotoInput.value)) gotoInput.value = shownPage.pageNumber;
});

prevPageButton.addEventListener("click", () => shownPage?.prevPage && navigate(shownPage.prevPage));
nextPageButton.addEventListener("click", () => shownPage?.nextPage && navigate(shownPage.nextPage));
refreshButton.addEventListener("click", () => loadRoute(currentRoute()));
settingsButton.addEventListener("click", () => settingsDialog.showModal());

favoriteButton.addEventListener("click", () => {
  if (!shownPage) return;
  toggleFavorite(shownPage.pageNumber, shownPage.pageName);
  updateFavoriteButton();
  renderBookmarks();
});

zoomOutButton.addEventListener("click", () => {
  setZoom(getZoom() - ZOOM_STEP);
  updateZoomButtons();
});
zoomInButton.addEventListener("click", () => {
  setZoom(getZoom() + ZOOM_STEP);
  updateZoomButtons();
});
zoomResetButton.addEventListener("click", () => {
  setZoom(ZOOM_DEFAULT);
  updateZoomButtons();
});

languageOptions.addEventListener("click", (e) => {
  const value = e.target.closest("[data-value]")?.dataset.value;
  if (!value) return;
  lang = value;
  setLanguage(value);
  applyLanguage();
});

themeOptions.addEventListener("click", (e) => {
  const value = e.target.closest("[data-value]")?.dataset.value;
  if (!value) return;
  setTheme(value);
  applyThemeOptionState();
});

addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  if (document.activeElement?.closest("input,textarea") || settingsDialog.open) return;

  if (e.key === "ArrowLeft") prevPageButton.click();
  else if (e.key === "ArrowRight") nextPageButton.click();
  else if (/^[0-9]$/.test(e.key)) gotoInput.focus();
});

onRouteChange(loadRoute);

initTheme();
initZoom();
applyLanguage();
applyThemeOptionState();
updateZoomButtons();
placeBookmarksRow();
renderBookmarks();
loadRoute(currentRoute());

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
