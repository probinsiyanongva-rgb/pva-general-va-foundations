#!/usr/bin/env bash
# General Admin VA v2.0 regression suite.
#   ./run_all.sh            unit + e2e against the local Cloudflare Pages runtime
#   PVA_BASE_URL=https://<preview>.pages.dev ./run_all.sh   e2e against a deployed preview
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --no-audit --no-fund

echo "== Branch safety (NT-08)"
# Protected branches must never move during the v2.0 build.
declare -A EXPECTED=(
  [main]=5778df53ba90b3d60e2f3d61658dfa8fb43e8225
  [production]=bc7272e9af3ae32fc52e166e75c041fd1905311c
  [rc/v2.0-migration]=d256c62f7fd0bee4aded284ebc449d08afa0d0c8
)
if REMOTE=$(git ls-remote --heads origin 2>/dev/null); then
  fail=0
  for b in "${!EXPECTED[@]}"; do
    actual=$(awk -v ref="refs/heads/$b" '$2==ref{print $1}' <<<"$REMOTE")
    if [ "$actual" = "${EXPECTED[$b]}" ]; then echo "  ok   $b ${actual:0:7}"; else echo "  FAIL $b expected ${EXPECTED[$b]:0:7} got ${actual:-missing}"; fail=1; fi
  done
  [ $fail = 0 ] || exit 1
else
  echo "  skipped (remote not reachable)"
fi

echo "== Unit tests"
node --test unit/*.test.js

echo "== End-to-end tests"
npx playwright test "$@"
