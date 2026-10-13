const API_BASE = "https://external.api.yle.fi/v1/teletext";
const API_ID = "id";
const API_KEY = "key";

export class PageNotFoundError extends Error {
  constructor(pageNumber) {
    super(`Teletext page ${pageNumber} not found`);
    this.name = "PageNotFoundError";
  }
}

function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function authQuery() {
  return `app_id=${API_ID}&app_key=${API_KEY}`;
}

function imageUrl(pageNumber, subpageNumber) {
  return `${API_BASE}/images/${pageNumber}/${subpageNumber}.png?${authQuery()}`;
}

function classifyLink(link) {
  if (/^[1-8]\d\d$/.test(link)) return { type: "page", page: link };
  if (link === ">>>") return { type: "subpage", direction: "next" };
  if (link.startsWith("mailto:")) return { type: "email", href: link };
  if (/^https?:\/\//.test(link)) return { type: "url", href: link };
  return null;
}

function extractLinks(blocks) {
  const structured = blocks.find((block) => block.type === "structured");
  if (!structured) return [];

  const links = [];
  for (const line of toArray(structured.line)) {
    const row = Number(line.number) - 1;
    let col = 0;
    for (const run of toArray(line.run)) {
      const length = Number(run.length);
      const target = run.link ? classifyLink(run.link) : null;
      if (target) {
        links.push({
          target,
          col,
          row,
          width: length,
          height: run.size === "double height" ? 2 : 1,
          text: run.Text ?? run.link,
        });
      }
      col += length;
    }
  }
  return links;
}

function normalizeSubpage(pageNumber, rawSubpage) {
  const subpageNumber = Number(rawSubpage.number);
  return {
    subpageNumber,
    imageUrl: imageUrl(pageNumber, subpageNumber),
    links: extractLinks(toArray(rawSubpage.content)),
  };
}

export async function fetchPage(pageNumber) {
  const response = await fetch(`${API_BASE}/pages/${pageNumber}.json?${authQuery()}`);
  if (response.status === 404) throw new PageNotFoundError(pageNumber);
  if (!response.ok) throw new Error(`Teletext API error: HTTP ${response.status}`);

  const pageData = (await response.json()).teletext.page;
  const rawSubpages = toArray(pageData.subpage);
  if (rawSubpages.length === 0) throw new PageNotFoundError(pageNumber);

  return {
    pageNumber: String(pageNumber),
    pageName: pageData.name,
    prevPage: pageData.prevpg ?? null,
    nextPage: pageData.nextpg ?? null,
    subpages: rawSubpages.map((rawSubpage) => normalizeSubpage(pageNumber, rawSubpage)),
  };
}
