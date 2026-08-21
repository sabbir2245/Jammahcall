#!/usr/bin/env bash
# Run backend + seed data + build & install frontend on a USB-connected Android device.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

BACKEND_PID=""
EXPO_PID=""

cleanup() {
  echo "[ru.sh] Stopping background processes..."
  [ -n "$EXPO_PID" ] && kill "$EXPO_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# 1. Backend: migrate, seed, run dev server
echo "[ru.sh] Applying migrations..."
(cd "$BACKEND" && ./venv/bin/python manage.py migrate)

echo "[ru.sh] Seeding data..."
(cd "$BACKEND" && ./venv/bin/python manage.py seed_data) || echo "[ru.sh] Seed skipped/failed (continuing)"

echo "[ru.sh] Starting backend on http://127.0.0.1:8000 ..."
(cd "$BACKEND" && ./venv/bin/python manage.py runserver 0.0.0.0:8000) &
BACKEND_PID=$!

# 2. Check for a connected Android device
if ! command -v adb >/dev/null 2>&1; then
  echo "[ru.sh] ERROR: adb not found. Install Android platform-tools." >&2
  exit 1
fi

DEVICE="$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
if [ -z "$DEVICE" ]; then
  echo "[ru.sh] ERROR: No Android device connected via USB debugging." >&2
  echo "        Enable Developer options -> USB debugging, then run: adb devices" >&2
  exit 1
fi
echo "[ru.sh] Found device: $DEVICE"
export ANDROID_SERIAL="$DEVICE"
DEVICE_NAME="$(adb -s "$DEVICE" shell getprop ro.product.model | tr -d '\r')"
echo "[ru.sh] Device name: $DEVICE_NAME"

# Optional: reverse port so the device can reach the local backend at localhost:8000
adb reverse tcp:8000 tcp:8000 || true

# 3. Frontend: compile locally and install on the connected device (expo run:android)
echo "[ru.sh] Building and installing frontend on $DEVICE ..."
(cd "$FRONTEND" && npx expo run:android)

wait "$BACKEND_PID"
