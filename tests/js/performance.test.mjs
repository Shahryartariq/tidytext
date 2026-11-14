// Worst-case timing for the browser implementation. Same inputs as
// tools/tests/test_performance.py: 200,000 characters of shapes that used to be slow.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { FLAGS, MAX_OUTPUT_CHARS, OutputTooLarge, apply, details, stats } from "../../static/js/transforms.js";

const MAX_INPUT_CHARS = 200_000;
const BUDGET_MS = 2000;
const payloads = JSON.parse(readFileSync(new URL("../../tools/tests/worst_case_inputs.json", import.meta.url), "utf8"));
const fill = (unit) => unit.repeat(Math.ceil(MAX_INPUT_CHARS / unit.length)).slice(0, MAX_INPUT_CHARS);
const configs = {
  "every option": { lineBreaks: "paragraphs", textCase: "sentence", flags: FLAGS, sort: "az" },
  "remove HTML tags": { flags: ["strip_html"] },
  "sentence case": { textCase: "sentence" },
  "title case": { textCase: "title" },
  "one line": { lineBreaks: "remove" },
};

for (const [name, unit] of Object.entries(payloads)) {
  test(`bounded time: ${name}`, () => {
    const text = fill(unit);
    for (const [label, options] of Object.entries(configs)) {
      const start = performance.now();
      apply(text, options);
      stats(text);
      details(text);
      const ms = performance.now() - start;
      assert.ok(ms < BUDGET_MS, `${label} took ${Math.round(ms)} ms`);
    }
  });
}

test("find and replace refuses to explode the text", () => {
  assert.throws(() => apply("a".repeat(MAX_INPUT_CHARS), { find: "a", replace: "b".repeat(1000) }), OutputTooLarge);
  assert.equal(apply("a".repeat(1000), { find: "a", replace: "bb" }).length, 2000);
  assert.equal(apply("abc".repeat(100_000), { find: "abc", replace: "" }), "");
  assert.ok(MAX_OUTPUT_CHARS >= 1_000_000);
});
