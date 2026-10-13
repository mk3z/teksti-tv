const STRINGS = {
  fi: {
    goToPage: "Siirry sivulle",
    pageLabel: "Sivu",
    prevPage: "Edellinen sivu",
    nextPage: "Seuraava sivu",
    refresh: "Päivitä",
    zoomIn: "Lähennä",
    zoomOut: "Loitonna",
    zoomReset: "Palauta oletuskoko",
    addFavorite: "Lisää suosikkeihin",
    removeFavorite: "Poista suosikeista",
    favoritesMenu: "Lisää suosikkeja",
    settings: "Asetukset",
    close: "Sulje",
    language: "Kieli",
    theme: "Teema",
    themeAuto: "Automaattinen",
    themeLight: "Vaalea",
    themeDark: "Tumma",
    notFound: "Sivua ei löytynyt.",
    loadError: "Sivun lataus epäonnistui. Yritä uudelleen.",
    source: "Lähde: Yle Teksti-TV",
  },
  en: {
    goToPage: "Go to page",
    pageLabel: "Page",
    prevPage: "Previous page",
    nextPage: "Next page",
    refresh: "Refresh",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomReset: "Reset zoom",
    addFavorite: "Add to favorites",
    removeFavorite: "Remove from favorites",
    favoritesMenu: "More favorites",
    settings: "Settings",
    close: "Close",
    language: "Language",
    theme: "Theme",
    themeAuto: "Auto",
    themeLight: "Light",
    themeDark: "Dark",
    notFound: "Page not found.",
    loadError: "Could not load the page. Please try again.",
    source: "Source: Yle Teksti-TV",
  },
};

export const LANGUAGES = Object.keys(STRINGS);

export function t(lang, key) {
  return STRINGS[lang]?.[key] ?? STRINGS.fi[key] ?? key;
}
