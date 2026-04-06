#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export PATH="/opt/homebrew/opt/ruby@3.1/bin:$PATH"

exec bundle _2.6.8_ exec jekyll serve --livereload "$@"
