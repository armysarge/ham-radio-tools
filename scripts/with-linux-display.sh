#!/usr/bin/env bash
# Xvfb provides a display; a window manager is also required for native window controls.
set -euo pipefail
for tool in xvfb-run openbox xprop; do
  command -v "$tool" >/dev/null || { echo "Missing $tool. Install xvfb, openbox and x11-utils for Linux GUI checks." >&2; exit 1; }
done
exec xvfb-run -a -s '-screen 0 1280x1024x24' bash -c '
  set -euo pipefail
  openbox --sm-disable &
  wm_pid=$!
  trap '\''kill "$wm_pid" 2>/dev/null || true'\'' EXIT
  for attempt in {1..100}; do
    if xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -q "window id #"; then
      "$@"
      exit $?
    fi
    kill -0 "$wm_pid" 2>/dev/null || { echo "Openbox exited before the desktop check." >&2; exit 1; }
    sleep 0.1
  done
  echo "Openbox did not initialize in time." >&2
  exit 1
' hrt-linux-display "$@"
