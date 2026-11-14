// Browser tests for TidyText's main user flows, against a running server.
//   make serve            (in one terminal; or any URL in TIDYTEXT_URL)
//   make e2e              (needs `npm ci` and `npx playwright install chromium` once)
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { chromium } from "playwright";

const BASE = (process.env.TIDYTEXT_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
let browser;
let context;
let page;
let errors;

const out = () => page.inputValue("[data-output]");
const open = async (path) => {
  errors.length = 0;
  await page.goto(BASE + path, { waitUntil: "networkidle" });
};
const typeInto = (text) => page.fill("[data-input]", text);

before(async () => {
  browser = await chromium.launch();
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  page = await context.newPage();
  errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
});
after(() => browser?.close());

describe("editing", () => {
  test("typing cleans the text and updates the counts", async () => {
    await open("/");
    await typeInto("one   two\nthree");
    assert.equal(await out(), "one two three");
    assert.match(await page.textContent('[data-stats="before"]'), /15\s*characters/);
    assert.equal(await page.locator("[data-example-tag]").count(), 0);
  });

  test("the word count panel follows the text", async () => {
    await open("/word-counter/");
    await typeInto("just four small words");
    assert.equal((await page.textContent('[data-detail="words"]')).trim(), "4");
    assert.doesNotMatch(await page.textContent('[data-stats="after"]'), /Already clean/);
  });

  test("pasting over the example replaces it", async () => {
    await open("/");
    await page.evaluate(() => navigator.clipboard.writeText("my own text"));
    await page.focus("[data-input]");
    await page.keyboard.press("ControlOrMeta+V");
    assert.equal(await page.inputValue("[data-input]"), "my own text");
  });

  test("clear empties both boxes", async () => {
    await open("/");
    await page.click('[data-action="clear"]');
    assert.equal(await page.inputValue("[data-input]"), "");
    assert.equal(await out(), "");
    assert.equal((await page.textContent('[data-stats="after"]')).trim(), "");
  });

  test("a huge find-and-replace result is refused with a message", async () => {
    await open("/find-and-replace/");
    await page.evaluate(() => {
      const input = document.querySelector("[data-input]");
      input.value = "a".repeat(100_000);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.fill('input[name="find"]', "a");
    await page.fill('input[name="replace"]', "b".repeat(100));
    assert.equal(await out(), "");
    assert.match(await page.textContent('[data-stats="after"]'), /shorter replacement/);
  });
});

describe("getting text in and out", () => {
  test("copy and Ctrl+Enter put the clean text on the clipboard", async () => {
    await open("/");
    await page.click('[data-action="copy"]');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await out());
    assert.equal((await page.textContent('[data-action="copy"]')).trim(), "Copied");
    await page.evaluate(() => navigator.clipboard.writeText(""));
    await page.focus("[data-input]");
    await page.keyboard.press("Control+Enter");
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await out());
  });

  test("open file, drop file and download", async () => {
    await open("/");
    const file = join(tmpdir(), "tidytext-e2e.txt");
    writeFileSync(file, "from   a file\n");
    await page.setInputFiles("[data-file]", file);
    await page.waitForFunction(() => document.querySelector("[data-input]").value.startsWith("from"));

    const drop = await page.evaluateHandle(() => {
      const data = new DataTransfer();
      data.items.add(new File(["dropped   text"], "d.txt", { type: "text/plain" }));
      return data;
    });
    await page.dispatchEvent(".pane", "drop", { dataTransfer: drop });
    await page.waitForFunction(() => document.querySelector("[data-input]").value === "dropped   text");

    const [download] = await Promise.all([page.waitForEvent("download"), page.click('[data-action="download"]')]);
    assert.equal(download.suggestedFilename(), "tidytext.txt");
  });
});

describe("options", () => {
  test("changing an option shows Reset, which restores the page's preset", async () => {
    await open("/");
    assert.equal(await page.isVisible('[data-action="reset"]'), false);
    await page.selectOption("#case", "upper");
    assert.match(await out(), /^THIS REPORT/);
    await page.click('[data-action="reset"]');
    assert.match(await out(), /^This report/);
    assert.equal(await page.isVisible('[data-action="reset"]'), false);
  });

  test("lowercase plus remove duplicates treats Apple and apple as one line", async () => {
    await open("/remove-duplicate-lines/");
    await typeInto("Apple\napple\nBanana");
    await page.selectOption("#case", "lower");
    assert.equal(await out(), "apple\nbanana");
  });

  test("find \\n joins lines", async () => {
    await open("/find-and-replace/");
    await typeInto("a\nb\nc");
    await page.fill('input[name="find"]', "\\n");
    await page.fill('input[name="replace"]', ", ");
    assert.equal(await out(), "a, b, c");
  });

  test("the theme button switches on the first click and is remembered", async () => {
    await open("/");
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const first = await background();
    await page.click("[data-theme-toggle]");
    const second = await background();
    assert.notEqual(first, second);
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await background(), second);
    await page.evaluate(() => localStorage.clear());
  });
});

describe("every page", () => {
  test("loads with one heading, a canonical link and no errors or sideways scroll", async () => {
    await open("/");
    const paths = await page.evaluate(async () => {
      const xml = await (await fetch("/sitemap.xml")).text();
      return [...new DOMParser().parseFromString(xml, "text/xml").querySelectorAll("loc")].map(
        (loc) => new URL(loc.textContent).pathname,
      );
    });
    assert.ok(paths.length >= 20);
    const phone = await browser.newPage({ viewport: { width: 360, height: 740 } });
    for (const path of paths) {
      const response = await page.goto(BASE + path, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, path);
      assert.equal(await page.locator("h1").count(), 1, path);
      assert.ok(await page.locator('link[rel="canonical"]').count(), path);
      await phone.goto(BASE + path);
      assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} scrolls sideways`);
    }
    await phone.close();
    assert.deepEqual(errors, []);
  });

  test("an unknown page is a helpful 404", async () => {
    const response = await page.goto(`${BASE}/no-such-page/`);
    assert.equal(response.status(), 404);
    assert.match(await page.textContent("h1"), /doesn't exist/);
  });
});

describe("without JavaScript", () => {
  let noJs;
  before(async () => {
    noJs = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
  });

  test("shows only working buttons, and Clean text works", async () => {
    await noJs.goto(`${BASE}/`);
    const visible = await noJs.$$eval('button[type="button"]', (buttons) =>
      buttons.filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()),
    );
    assert.deepEqual(visible, []);
    await noJs.fill("textarea[name=text]", "Hello    world,\nthis  is   a test.");
    await Promise.all([noJs.waitForNavigation(), noJs.click("[data-submit]")]);
    assert.equal(await noJs.inputValue("[data-output]"), "Hello world, this is a test.");
    assert.equal((await noJs.textContent('[data-detail="words"]')).trim(), "6");
  });

  test("empty, oversized and exploding posts get clear messages", async () => {
    await noJs.goto(`${BASE}/`);
    await noJs.fill("textarea[name=text]", "   ");
    await Promise.all([noJs.waitForNavigation(), noJs.click("[data-submit]")]);
    assert.match(await noJs.textContent(".form-error"), /Paste some text/);

    const big = await noJs.request.post(`${BASE}/`, { form: { text: "a".repeat(5_000_000) } });
    assert.equal(big.status(), 413);
    assert.match(await big.text(), /too long/);

    const exploding = await noJs.request.post(`${BASE}/`, {
      form: { text: "a".repeat(100_000), find: "a", replace: "b".repeat(1000) },
    });
    assert.equal(exploding.status(), 413);
    assert.ok((await exploding.text()).length < 2_000_000);
  });
});
