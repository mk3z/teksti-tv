import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPage, PageNotFoundError } from "../js/api.js";

const LINK_RUNS = [
  { bg: "black", fg: "white", length: "5" },
  { bg: "black", fg: "blue", link: "235", length: "3", Text: "235" },
  {
    bg: "black",
    fg: "blue",
    link: "https://example.com",
    length: "10",
    Text: "example.com",
  },
  {
    bg: "black",
    fg: "blue",
    link: "mailto:test@example.com",
    length: "4",
    Text: "mail",
  },
  { bg: "black", fg: "blue", link: ">>>", length: "3", Text: ">>>" },
  {
    bg: "black",
    fg: "white",
    link: "480",
    length: "3",
    size: "double height",
    Text: "480",
  },
  { bg: "black", fg: "blue", link: "tel:12345", length: "3", Text: "tel" },
];

const SAMPLE_PAGE = {
  teletext: {
    page: {
      number: "100",
      name: "Test page",
      subpagecount: "2",
      nextpg: "101",
      time: "2026-10-11T10:00:00",
      subpage: [
        {
          number: "1",
          content: [
            { type: "text", line: [{ number: "1", Text: "hello" }] },
            { type: "structured", line: [{ number: "1", run: [{ bg: "black", fg: "white", length: "40" }] }] },
          ],
        },
        {
          number: "2",
          content: [
            { type: "text", line: [{ number: "1", Text: "world" }] },
            { type: "structured", line: [{ number: "1", run: LINK_RUNS }] },
          ],
        },
      ],
    },
  },
};

function withMockedFetch(responder, run) {
  const original = globalThis.fetch;
  globalThis.fetch = responder;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

test("fetchPage normalizes page metadata, prev/next, and all subpages", () =>
  withMockedFetch(
    async () => new Response(JSON.stringify(SAMPLE_PAGE), { status: 200 }),
    async () => {
      const page = await fetchPage("100");
      assert.equal(page.pageNumber, "100");
      assert.equal(page.prevPage, null);
      assert.equal(page.nextPage, "101");

      assert.equal(page.subpages.length, 2);
      assert.equal(page.subpages[0].subpageNumber, 1);
      assert.match(page.subpages[0].imageUrl, /\/images\/100\/1\.png\?/);
      assert.equal(page.subpages[1].subpageNumber, 2);
      assert.match(page.subpages[1].imageUrl, /\/images\/100\/2\.png\?/);
    },
  ));

test("fetchPage extracts and classifies links with grid position", () =>
  withMockedFetch(
    async () => new Response(JSON.stringify(SAMPLE_PAGE), { status: 200 }),
    async () => {
      const page = await fetchPage("100");
      const links = page.subpages[1].links;
      assert.equal(links.length, 5);

      assert.deepEqual(links[0], {
        target: { type: "page", page: "235" },
        col: 5,
        row: 0,
        width: 3,
        height: 1,
        text: "235",
      });
      assert.deepEqual(links[1].target, { type: "url", href: "https://example.com" });
      assert.deepEqual(links[2].target, { type: "email", href: "mailto:test@example.com" });
      assert.deepEqual(links[3].target, { type: "subpage", direction: "next" });

      const doubleHeight = links[4];
      assert.deepEqual(doubleHeight.target, { type: "page", page: "480" });
      assert.equal(doubleHeight.col, 25);
      assert.equal(doubleHeight.height, 2);
    },
  ));

test("fetchPage handles single-item XML->JSON collapse (subpage/content/line/run as object)", () =>
  withMockedFetch(
    async () =>
      new Response(
        JSON.stringify({
          teletext: {
            page: {
              number: "100",
              name: "Test page",
              subpagecount: "1",
              subpage: {
                number: "1",
                content: {
                  type: "structured",
                  line: {
                    number: "24",
                    run: { bg: "black", fg: "white", length: "40" },
                  },
                },
              },
            },
          },
        }),
        { status: 200 },
      ),
    async () => {
      const page = await fetchPage("100");
      assert.equal(page.subpages.length, 1);
      assert.equal(page.subpages[0].subpageNumber, 1);
      assert.equal(page.subpages[0].links.length, 0);
    },
  ));

test("fetchPage throws PageNotFoundError on 404", () =>
  withMockedFetch(
    async () => new Response("", { status: 404 }),
    async () => {
      await assert.rejects(() => fetchPage("999"), PageNotFoundError);
    },
  ));
