#!/usr/bin/env bash
# Cloudflare Pages build step: publish only the course website.
#
# Cloudflare Pages settings for this project:
#   Build command:          bash tools/build-pages.sh
#   Build output directory: dist
#
# Copies an explicit allowlist of site files into dist/. Everything else in the
# repository (tests/, tools/, readme.md, netlify.toml, .git) is never published.
# The build fails if a new top-level entry appears that is neither published nor
# excluded, so a new file can't go live (or go missing) without a decision here.
# No file is modified; the copy is byte-for-byte.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=dist

# Published: the General Admin course, the Customer Support pathway and shared files.
PUBLISH=(
  index.html
  404.html
  _headers
  script.js
  shared
  lessons
  final-project
  certificate
  customer-support
)

# Kept in the repository, never published.
EXCLUDE=(
  .git
  .gitignore
  tests
  tools
  readme.md
  netlify.toml
  "$OUT"
)

# Every top-level entry must be listed above.
unknown=0
for entry in * .[!.]*; do
  [ -e "$entry" ] || continue
  listed=0
  for p in "${PUBLISH[@]}" "${EXCLUDE[@]}"; do
    [ "$entry" = "$p" ] && listed=1 && break
  done
  if [ $listed = 0 ]; then
    echo "build-pages: '$entry' is not in PUBLISH or EXCLUDE in tools/build-pages.sh" >&2
    unknown=1
  fi
done
[ $unknown = 0 ] || exit 1

rm -rf "$OUT"
mkdir "$OUT"
for p in "${PUBLISH[@]}"; do
  if [ ! -e "$p" ]; then
    echo "build-pages: expected site entry '$p' is missing" >&2
    exit 1
  fi
  cp -R "$p" "$OUT/"
done

echo "build-pages: published $(find "$OUT" -type f | wc -l | tr -d ' ') files to $OUT/"
