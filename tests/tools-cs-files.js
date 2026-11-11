// Files that make up the Customer Support pathway or that it loads.
// RT-36: none of these may change during the General Admin v2.0 build.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SHARED_FILES = ["shared/styles.css", "shared/progress-cs.js", "shared/cs-lessons-data.js"];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

function csFileHashes() {
  const files = walk(path.join(ROOT, "customer-support"))
    .map((p) => path.relative(ROOT, p).split(path.sep).join("/"))
    .concat(SHARED_FILES)
    .sort();
  const out = {};
  for (const f of files) {
    out[f] = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, f))).digest("hex");
  }
  return out;
}

module.exports = { csFileHashes, ROOT };

if (require.main === module) {
  // node tools-cs-files.js > fixtures/cs-baseline-files.json   (baseline only)
  process.stdout.write(JSON.stringify(csFileHashes(), null, 2) + "\n");
}
