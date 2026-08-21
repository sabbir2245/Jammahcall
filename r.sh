#!/usr/bin/env bash
# Run the Jama'at backend (Django).
# Usage: ./r.sh   (use --clear to wipe and reseed demo data)

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PYTHON="$BACKEND_DIR/venv/bin/python"
SEED_FLAG=""

# Optional: ./r.sh --clear  -> drop and reseed demo data
if [[ "$1" == "--clear" ]]; then
  SEED_FLAG="--clear"
fi

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
echo "====> Launching backend (Django) <===="
cd "$BACKEND_DIR"

# Kill any stale backend already bound to port 8000.
if lsof -ti :8000 >/dev/null 2>&1; then
  echo "Freeing port 8000 (killing stale backend)..."
  lsof -ti :8000 | xargs -r kill 2>/dev/null || true
  sleep 1
fi

# Apply any pending migrations (settings load DB config from backend/.env).
"$PYTHON" manage.py migrate

# Load seed_data: 25 demo users + Jama'ahs + requests/members/pray needs.
echo "====> Seeding demo data <===="
"$PYTHON" manage.py seed_data $SEED_FLAG

# Start the Django dev server in the foreground.
echo "Backend starting at http://0.0.0.0:8000..."
exec "$PYTHON" manage.py runserver 0.0.0.0:8000