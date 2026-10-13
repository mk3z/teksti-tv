import { t } from "./i18n.js";

const COLS = 40;
const ROWS = 24;

function linkElement(link, subpageEl) {
  const a = document.createElement("a");
  a.className = "viewer__link";
  a.style.left = `${(link.col / COLS) * 100}%`;
  a.style.top = `${(link.row / ROWS) * 100}%`;
  a.style.width = `${(link.width / COLS) * 100}%`;
  a.style.height = `${(link.height / ROWS) * 100}%`;
  a.title = link.text.trim();

  switch (link.target.type) {
    case "page":
      a.href = `#${link.target.page}`;
      break;
    case "url":
      a.href = link.target.href;
      a.target = "_blank";
      a.rel = "noopener";
      break;
    case "email":
      a.href = link.target.href;
      break;
    case "subpage":
      a.href = "#";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        subpageEl.nextElementSibling?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      break;
  }
  return a;
}

function imageAlt(pageData, subpage, lang) {
  return `${t(lang, "pageLabel")} ${pageData.pageNumber}/${subpage.subpageNumber}`;
}

function subpageElement(pageData, subpage, lang, isFirst) {
  const subpageEl = document.createElement("div");
  subpageEl.className = "viewer__subpage";

  const img = document.createElement("img");
  img.className = "viewer__image";
  img.src = subpage.imageUrl;
  img.alt = imageAlt(pageData, subpage, lang);
  img.width = 720;
  img.height = 432;
  img.loading = isFirst ? "eager" : "lazy";
  img.fetchPriority = isFirst ? "high" : "low";
  subpageEl.append(img);

  for (const link of subpage.links) {
    subpageEl.append(linkElement(link, subpageEl));
  }
  return subpageEl;
}

export function renderPage(container, pageData, lang) {
  container.replaceChildren(
    ...pageData.subpages.map((subpage, i) => subpageElement(pageData, subpage, lang, i === 0)),
  );
}

export function relabelPage(container, pageData, lang) {
  container.querySelectorAll(".viewer__image").forEach((img, i) => {
    img.alt = imageAlt(pageData, pageData.subpages[i], lang);
  });
}
