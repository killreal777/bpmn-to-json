#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
CONVERTER_DIR="${SKILL_DIR}/assets/bpmn-to-json"

if [[ $# -ne 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  cat <<'EOF'
Usage:
  bpmn-metrics.sh <input.bpmn>
EOF
  exit 1
fi

if [[ ! -f "${CONVERTER_DIR}/dist/metrics.js" ]]; then
  echo "Bundled converter is missing: ${CONVERTER_DIR}/dist/metrics.js" >&2
  exit 1
fi

if [[ ! -d "${CONVERTER_DIR}/node_modules/bpmn-moddle" ]]; then
  (cd "${CONVERTER_DIR}" && npm ci --omit=dev)
fi

node "${CONVERTER_DIR}/dist/metrics.js" "$1"
