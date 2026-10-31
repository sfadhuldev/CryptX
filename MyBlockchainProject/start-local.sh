#!/usr/bin/env bash
set -euo pipefail

# SecureCounter one-command local launcher.
# Starts Anvil if needed, deploys the contract, and starts the Vite dashboard.
# Press Ctrl+C to stop the dashboard and any Anvil instance started here.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CHAIN_ID="${CHAIN_ID:-31337}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

ANVIL_PID=""
VITE_PID=""

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if [[ -n "$VITE_PID" ]] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
  fi

  if [[ -n "$ANVIL_PID" ]] && kill -0 "$ANVIL_PID" 2>/dev/null; then
    kill "$ANVIL_PID" 2>/dev/null || true
    rm -f .anvil.pid
  fi

  exit "$exit_code"
}
trap cleanup EXIT INT TERM

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is not installed or not on PATH."
    exit 1
  fi
}

rpc_is_up() {
  curl -s -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    "$RPC_URL" >/dev/null 2>&1
}

echo "SecureCounter local launcher"
echo "---------------------------"

require_command forge
require_command anvil
require_command cast
require_command curl
require_command python3
require_command node
require_command npm

if [[ ! -d frontend/node_modules ]]; then
  echo "Installing frontend dependencies (first run only)..."
  (cd frontend && npm install)
fi

if rpc_is_up; then
  EXISTING_CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
  if [[ "$EXISTING_CHAIN_ID" != "$CHAIN_ID" ]]; then
    echo "Error: a chain is already running at $RPC_URL with chain id $EXISTING_CHAIN_ID."
    echo "Expected chain id $CHAIN_ID. Stop it or choose another RPC_URL."
    exit 1
  fi
  echo "Using the Anvil instance already running at $RPC_URL"
else
  echo "Starting Anvil at $RPC_URL ..."
  anvil --host 127.0.0.1 --port "$ANVIL_PORT" --chain-id "$CHAIN_ID" >.anvil.log 2>&1 &
  ANVIL_PID=$!
  echo "$ANVIL_PID" >.anvil.pid

  for _ in $(seq 1 40); do
    if rpc_is_up; then
      break
    fi
    sleep 0.25
  done

  if ! rpc_is_up; then
    echo "Error: Anvil did not start. Last log lines:"
    tail -n 20 .anvil.log || true
    exit 1
  fi
  echo "Anvil is ready (pid $ANVIL_PID)."
fi

./deploy-local.sh

echo
echo "Starting the visual dashboard ..."
echo "Open: http://127.0.0.1:${FRONTEND_PORT}"
echo "Press Ctrl+C to stop the dashboard and any Anvil instance started by this script."
echo

cd frontend
npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" &
VITE_PID=$!
cd ..

wait "$VITE_PID"
