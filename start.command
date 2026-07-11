#!/bin/zsh
# Cup Atlas launcher — serves the app on localhost (needed for the camera) and opens it.
cd "$(dirname "$0")"
PORT=8787
if ! lsof -i :$PORT >/dev/null 2>&1; then
  nohup python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
open "http://localhost:$PORT"
