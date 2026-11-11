// RT-36 (file level): the Customer Support pathway and the shared files it
// loads must stay byte-identical to the migration baseline (main @ 5778df5).
const test = require("node:test");
const assert = require("node:assert");
const { csFileHashes } = require("../tools-cs-files.js");
const baseline = require("../fixtures/cs-baseline-files.json");

test("Customer Support files are unchanged from the baseline", () => {
  const now = csFileHashes();
  assert.deepStrictEqual(Object.keys(now), Object.keys(baseline), "file list changed");
  const changed = Object.keys(baseline).filter((f) => now[f] !== baseline[f]);
  assert.deepStrictEqual(changed, [], "changed files: " + changed.join(", "));
});
