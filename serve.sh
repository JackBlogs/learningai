#!/bin/bash
# 启动本地 HTTP 服务器，用于预览 index.html 并实时加载 README.md
PORT=8000
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
echo "Serving at http://localhost:$PORT"
echo "Directory: $SCRIPT_DIR"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT"
