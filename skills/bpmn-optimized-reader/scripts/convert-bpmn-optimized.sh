#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
CONVERTER_DIR="${SKILL_DIR}/assets/bpmn-to-json"
REPO_ROOT="$(cd "${SKILL_DIR}/../.." && pwd -P)"
PACKAGED_CONVERTER_DIR="${REPO_ROOT}/plugins/bpmn-optimized-reader/skills/bpmn-optimized-reader/assets/bpmn-to-json"

usage() {
  cat <<'EOF'
Usage:
  convert-bpmn-optimized.sh <input.bpmn> -o <output.json>
EOF
}

INPUT="${1:-}"
if [[ -z "${INPUT}" || "${INPUT}" == "-h" || "${INPUT}" == "--help" ]]; then
  usage
  exit 1
fi

shift || true
OUTPUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output)
      OUTPUT="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${OUTPUT}" ]]; then
  echo "Missing required -o/--output" >&2
  usage >&2
  exit 1
fi

if [[ ! -f "${CONVERTER_DIR}/dist/cli.js" && -f "${PACKAGED_CONVERTER_DIR}/dist/cli.js" ]]; then
  CONVERTER_DIR="${PACKAGED_CONVERTER_DIR}"
fi

if [[ ! -f "${CONVERTER_DIR}/dist/cli.js" ]]; then
  if [[ -f "${REPO_ROOT}/package.json" ]] && grep -q '"build:skill"' "${REPO_ROOT}/package.json"; then
    (cd "${REPO_ROOT}" && npm run build:skill)
  else
    echo "Bundled converter is missing: ${CONVERTER_DIR}/dist/cli.js" >&2
    exit 1
  fi
fi

if [[ ! -d "${CONVERTER_DIR}/node_modules/bpmn-moddle" ]]; then
  (cd "${CONVERTER_DIR}" && npm ci --omit=dev)
fi

node "${CONVERTER_DIR}/dist/cli.js" "${INPUT}" -o "${OUTPUT}" --preset optimized
printf '%s\n' "${OUTPUT}"
