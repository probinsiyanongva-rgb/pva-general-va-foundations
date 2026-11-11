// Site-wide checks: every internal link resolves, Cloudflare headers apply,
// unknown paths get the site's 404 page.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const SKIP_DIRS = new Set(["tests", "node_modules", ".git", ".wrangler"]);

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (SKIP_DIRS.has(d.name)) return [];
    const p = path.join(dir, d.name);
    return d.isDirectory() ? htmlFiles(p) : d.name.endsWith(".html") ? [p] : [];
  });
}

test("every internal href/src resolves with 200", async ({ request }) => {
  const links = new Set();
  for (const file of htmlFiles(ROOT)) {
    const pageUrl = "/" + path.relative(ROOT, file).split(path.sep).join("/");
    const html = fs.readFileSync(file, "utf8");
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"#?]+)/g)) {
      if (/^(https?:|mailto:|data:)/.test(ref)) continue;
      links.add(ref.startsWith("/") ? ref : path.posix.join(path.posix.dirname(pageUrl), ref));
    }
  }
  const dead = [];
  for (const l of links) {
    const r = await request.get(l);
    if (r.status() !== 200) dead.push(`${l} -> ${r.status()}`);
  }
  expect(links.size).toBeGreaterThan(30);
  expect(dead).toEqual([]);
});

test("security headers from _headers are applied", async ({ request }) => {
  const r = await request.get("/");
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
  expect(r.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("unknown paths return the site's 404 page", async ({ request }) => {
  const r = await request.get("/no-such-page/");
  expect(r.status()).toBe(404);
  expect(await r.text()).toContain("That page isn't filed here.");
});
