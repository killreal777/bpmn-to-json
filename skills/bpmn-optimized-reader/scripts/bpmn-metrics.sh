#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
CONVERTER_DIR="${SKILL_DIR}/assets/bpmn-to-json"
REPO_ROOT="$(cd "${SKILL_DIR}/../.." && pwd -P)"
PACKAGED_CONVERTER_DIR="${REPO_ROOT}/plugins/bpmn-optimized-reader/skills/bpmn-optimized-reader/assets/bpmn-to-json"

if [[ $# -ne 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  cat <<'EOF'
Usage:
  bpmn-metrics.sh <input.bpmn>
EOF
  exit 1
fi

if [[ ! -f "${CONVERTER_DIR}/dist/metrics.js" && -f "${PACKAGED_CONVERTER_DIR}/dist/metrics.js" ]]; then
  CONVERTER_DIR="${PACKAGED_CONVERTER_DIR}"
fi

if [[ ! -f "${CONVERTER_DIR}/dist/metrics.js" ]]; then
  if [[ -f "${REPO_ROOT}/package.json" ]] && grep -q '"build:skill"' "${REPO_ROOT}/package.json"; then
    (cd "${REPO_ROOT}" && npm run build:skill)
  else
    echo "Bundled converter is missing: ${CONVERTER_DIR}/dist/metrics.js" >&2
    exit 1
  fi
fi

if [[ ! -d "${CONVERTER_DIR}/node_modules/bpmn-moddle" ]]; then
  (cd "${CONVERTER_DIR}" && npm ci --omit=dev)
fi

node "${CONVERTER_DIR}/dist/metrics.js" "$1"
