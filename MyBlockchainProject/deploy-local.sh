#!/usr/bin/env bash
set -euo pipefail

# Deploy SecureCounter to a running local Anvil node and update the address
# consumed by the frontend. Run ./start-local.sh instead for the full stack.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CHAIN_ID="${CHAIN_ID:-31337}"

# Public Anvil development key #0. It is not a real key and must never hold funds.
DEPLOYER_PRIVATE_KEY="${ANVIL_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

for command_name in forge cast python3; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: '$command_name' is not installed or not on PATH."
    exit 1
  fi
done

if ! cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  echo "Error: no local chain is reachable at $RPC_URL."
  echo "Start Anvil in another terminal with: anvil"
  exit 1
fi

ACTUAL_CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
if [[ "$ACTUAL_CHAIN_ID" != "$CHAIN_ID" ]]; then
  echo "Error: chain id is $ACTUAL_CHAIN_ID, expected $CHAIN_ID."
  exit 1
fi

echo "Compiling contracts with Solidity 0.8.28 ..."
forge build

echo "Deploying SecureCounter to $RPC_URL ..."
forge script script/DeploySecureCounter.s.sol:DeploySecureCounter \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$DEPLOYER_PRIVATE_KEY"

BROADCAST_FILE="broadcast/DeploySecureCounter.s.sol/${CHAIN_ID}/run-latest.json"

if [[ ! -f "$BROADCAST_FILE" ]]; then
  echo "Error: deployment broadcast file not found at $BROADCAST_FILE"
  exit 1
fi

python3 - "$BROADCAST_FILE" <<'PY'
import json
import sys
from pathlib import Path

broadcast_path = Path(sys.argv[1])
data = json.loads(broadcast_path.read_text())

created = next(
    (
        tx
        for tx in data.get("transactions", [])
        if tx.get("transactionType") == "CREATE" and tx.get("contractName") == "SecureCounter"
    ),
    None,
)

if not created or not created.get("contractAddress"):
    raise SystemExit("Error: SecureCounter creation transaction not found in broadcast file.")


def as_int(value, default=0):
    if value is None:
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        return int(value, 16) if value.startswith("0x") else int(value)
    return int(value)


receipt = next(
    (
        item
        for item in data.get("receipts", [])
        if item.get("transactionHash") == created.get("hash")
    ),
    {},
)

deployment = {
    "address": created["contractAddress"],
    "chainId": as_int(data.get("chain"), 31337),
    "deployedBlockNumber": as_int(receipt.get("blockNumber"), 0),
    "transactionHash": created.get("hash", ""),
}

output_path = Path("frontend/public/deployment.json")
output_path.write_text(json.dumps(deployment, indent=2) + "\n")
print(f"Deployment address written to {output_path}")
PY

DEPLOYED_ADDRESS="$(python3 -c 'import json; print(json.load(open("frontend/public/deployment.json"))["address"])')"
echo "SecureCounter address: $DEPLOYED_ADDRESS"
