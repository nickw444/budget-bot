#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")"/.. && pwd)

main() {
  cd "${ROOT_DIR}";
  npm start -- $@;
}

main "$@"
