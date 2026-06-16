#!/bin/bash
# Novaé — double-click this file (macOS) to launch the app.
cd "$(dirname "$0")" || exit 1
PORT=8000
echo "Novaé → http://localhost:$PORT"
( sleep 1 && open "http://localhost:$PORT" ) &
ruby -run -e httpd www -p "$PORT"
