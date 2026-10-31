import { Contract, JsonRpcProvider } from "ethers";
import abi from "./abi.json";
import "./style.css";

const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const dom = {
  networkBadge: document.getElementById("network-badge"),
  networkStatus: document.getElementById("network-status"),
  refreshBtn: document.getElementById("refresh-btn"),
  chainId: document.getElementById("chain-id"),
  counterValue: document.getElementById("counter-value"),
  maxValue: document.getElementById("max-value"),
  maxValueInline: document.getElementById("max-value-inline"),
  progressTrack: document.getElementById("progress-track"),
  progressBar: document.getElementById("progress-bar"),
  counterNote: document.getElementById("counter-note"),
  ownerAddress: document.getElementById("owner-address"),
  copyOwner: document.getElementById("copy-owner"),
  contractAddress: document.getElementById("contract-address"),
  rpcUrl: document.getElementById("rpc-url"),
  controlsPanel: document.querySelector(".controls-panel"),
  accountSelect: document.getElementById("account-select"),
  accountRole: document.getElementById("account-role"),
  selectedAddress: document.getElementById("selected-address"),
  incrementBtn: document.getElementById("increment-btn"),
  numberInput: document.getElementById("number-input"),
  setBtn: document.getElementById("set-btn"),
  status: document.getElementById("status"),
  statusText: document.getElementById("status-text"),
  eventCount: document.getElementById("event-count"),
  eventsList: document.getElementById("events-list")
};

let provider;
let contract;
let deployment;
let accounts = [];
let owner = "";
let maxValue = 100n;
let selectedAccount = "";
let busy = false;

function shortAddress(address, left = 6, right = 4) {
  if (!address || typeof address !== "string") return "--";
  if (address.length <= left + right + 2) return address;
  return `${address.slice(0, left)}...${address.slice(-right)}`;
}

function shortHash(hash) {
  return shortAddress(hash, 10, 6);
}

function sameAddress(first, second) {
  return Boolean(first && second && first.toLowerCase() === second.toLowerCase());
}

function setNetwork(state, label) {
  dom.networkBadge.classList.remove("is-online", "is-offline");
  if (state === "online") dom.networkBadge.classList.add("is-online");
  if (state === "offline") dom.networkBadge.classList.add("is-offline");
  dom.networkStatus.textContent = label;
}

function setStatus(kind, message) {
  dom.status.className = `status status-${kind}`;
  dom.statusText.textContent = message;
}

function setControlsEnabled(enabled) {
  dom.incrementBtn.disabled = !enabled;
  dom.setBtn.disabled = !enabled;
  dom.accountSelect.disabled = !enabled;
  dom.numberInput.disabled = !enabled;
}

function setBusy(value) {
  busy = value;
  dom.controlsPanel.classList.toggle("is-busy", value);
  dom.refreshBtn.disabled = value;

  if (value) {
    setControlsEnabled(false);
  } else {
    setControlsEnabled(Boolean(contract));
  }
}

async function loadDeployment() {
  const response = await fetch(`/deployment.json?t=${Date.now()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("deployment file could not be loaded");
  }

  const data = await response.json();

  if (!data.address || sameAddress(data.address, ZERO_ADDRESS)) {
    throw new Error("SecureCounter is not deployed yet");
  }

  return data;
}

function renderNumber(numberValue) {
  const value = BigInt(numberValue);
  const percent =
    maxValue === 0n ? 0 : Math.min(100, Math.round((Number(value) / Number(maxValue)) * 100));

  dom.counterValue.textContent = value.toString();
  dom.maxValue.textContent = maxValue.toString();
  dom.maxValueInline.textContent = maxValue.toString();
  dom.progressBar.style.width = `${percent}%`;
  dom.progressBar.classList.toggle("is-full", value >= maxValue);
  dom.progressTrack.setAttribute("aria-valuemax", maxValue.toString());
  dom.progressTrack.setAttribute("aria-valuenow", value.toString());

  if (value >= maxValue) {
    dom.counterNote.textContent =
      "The limit is reached. Increment is blocked until the owner sets a lower value.";
  } else {
    dom.counterNote.textContent = `The value starts at 0. The contract rejects any value above ${maxValue}.`;
  }
}

function renderOwner() {
  dom.ownerAddress.textContent = owner || "--";
  dom.ownerAddress.title = owner || "";
  dom.contractAddress.textContent = `Contract: ${shortAddress(deployment?.address, 8, 6)}`;
  dom.contractAddress.title = deployment?.address || "";
  dom.rpcUrl.textContent = `RPC: ${RPC_URL}`;
}

function renderAccounts(accountList) {
  const previous = selectedAccount;
  const unique = [];

  for (const address of accountList) {
    if (!unique.some((item) => sameAddress(item, address))) unique.push(address);
  }

  if (owner && !unique.some((address) => sameAddress(address, owner))) {
    unique.unshift(owner);
  }

  dom.accountSelect.replaceChildren();

  unique.forEach((address, index) => {
    const option = document.createElement("option");
    const isOwner = sameAddress(address, owner);
    option.value = address;
    option.textContent = `#${index}  ${shortAddress(address)}  ·  ${
      isOwner ? "Owner (authorized)" : "Not owner (will revert)"
    }`;
    dom.accountSelect.append(option);
  });

  const fallback = unique.find((address) => sameAddress(address, owner)) || unique[0] || "";
  selectedAccount = unique.some((address) => sameAddress(address, previous)) ? previous : fallback;
  dom.accountSelect.value = selectedAccount;
  updateAccountMeta();
}

function updateAccountMeta() {
  if (!selectedAccount) {
    dom.accountRole.className = "role-pill role-loading";
    dom.accountRole.textContent = "Waiting for Anvil";
    dom.selectedAddress.textContent = "--";
    return;
  }

  const isOwner = sameAddress(selectedAccount, owner);
  dom.accountRole.className = `role-pill ${isOwner ? "role-owner" : "role-guest"}`;
  dom.accountRole.textContent = isOwner ? "Owner · authorized" : "Not owner · rejected";
  dom.selectedAddress.textContent = shortAddress(selectedAccount, 8, 6);
  dom.selectedAddress.title = selectedAccount;
}

function makeEmptyState(message) {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-state";
  paragraph.textContent = message;
  return paragraph;
}

function makeEventRow(log) {
  const args = log.args || {};
  const row = document.createElement("div");
  row.className = "event-row";

  const main = document.createElement("div");
  main.className = "event-main";

  const value = document.createElement("span");
  value.className = "event-value";
  const arrow = document.createElement("span");
  arrow.className = "event-arrow";
  arrow.textContent = "  →  ";
  value.append(
    document.createTextNode(String(args.oldValue ?? "?")),
    arrow,
    document.createTextNode(String(args.newValue ?? "?"))
  );

  const meta = document.createElement("span");
  meta.className = "event-meta";
  meta.textContent = `${shortAddress(String(args.changedBy || ""), 8, 6)} · block ${log.blockNumber}`;

  const hash = document.createElement("code");
  hash.className = "event-hash";
  hash.textContent = shortHash(log.transactionHash || "");
  hash.title = log.transactionHash || "";

  main.append(value, meta);
  row.append(main, hash);
  return row;
}

async function loadEvents() {
  if (!contract) return;

  try {
    const fromBlock = Number(deployment?.deployedBlockNumber ?? 0);
    const logs = await contract.queryFilter(contract.filters.NumberChanged(), fromBlock, "latest");

    dom.eventCount.textContent = `${logs.length} ${logs.length === 1 ? "event" : "events"}`;
    dom.eventsList.replaceChildren();

    if (logs.length === 0) {
      dom.eventsList.append(
        makeEmptyState("No changes yet. The counter is still at its initial value.")
      );
      return;
    }

    logs
      .slice()
      .reverse()
      .slice(0, 8)
      .forEach((log) => dom.eventsList.append(makeEventRow(log)));
  } catch (error) {
    dom.eventCount.textContent = "Events unavailable";
    dom.eventsList.replaceChildren(
      makeEmptyState("Could not read events. Check that Anvil is still running.")
    );
  }
}

async function refreshState() {
  const [numberValue, ownerValue, limitValue] = await Promise.all([
    contract.number(),
    contract.owner(),
    contract.MAX_VALUE()
  ]);

  owner = ownerValue;
  maxValue = BigInt(limitValue);
  renderNumber(numberValue);
  renderOwner();
  updateAccountMeta();
  await loadEvents();
}

function collectErrorText(error) {
  const candidates = [
    error?.shortMessage,
    error?.reason,
    error?.message,
    error?.info?.error?.message,
    error?.error?.message,
    error?.data?.message
  ];

  return candidates.filter((item) => typeof item === "string" && item.length > 0).join(" | ");
}

function explainConnectionError(error) {
  const text = collectErrorText(error);

  if (/not deployed|deployment file/i.test(text)) {
    return "SecureCounter is not deployed yet. Run ./start-local.sh from the project root, then refresh.";
  }

  if (/could not detect network|failed to fetch|networkerror|econnrefused|connect/i.test(text)) {
    return `Cannot reach Anvil at ${RPC_URL}. Start the local chain with "anvil" or run ./start-local.sh.`;
  }

  if (/could not decode result data|BAD_DATA|no unlocked local accounts/i.test(text)) {
    return "The saved contract address is not available on this chain. Run ./deploy-local.sh, then reload the page.";
  }

  return text || "Could not connect to the local blockchain.";
}

function explainTransactionError(error) {
  const text = collectErrorText(error);

  if (/not owner/i.test(text)) {
    return "Access denied: only the contract owner can change the number. Switch to the owner account and try again.";
  }

  if (/invalid number/i.test(text)) {
    return "Rejected by the contract: the value must be 100 or less.";
  }

  if (/limit reached/i.test(text)) {
    return "Rejected by the contract: the counter is already at 100, so increment is blocked.";
  }

  if (/user rejected|user denied/i.test(text)) {
    return "The local account rejected the transaction.";
  }

  return text
    ? `Transaction failed: ${text}`
    : "Transaction failed for an unknown reason. Check the Anvil terminal for details.";
}

async function runTransaction(kind, simulate, send) {
  if (busy || !contract || !selectedAccount) return;

  const isOwner = sameAddress(selectedAccount, owner);
  const accountLabel = isOwner ? "owner" : "non-owner";
  const actionLabel = kind === "increment" ? "Increment" : "Update";

  setBusy(true);

  try {
    setStatus(
      "pending",
      `${actionLabel} requested by ${accountLabel} account. Checking access control and limits...`
    );

    const signer = await provider.getSigner(selectedAccount);
    const connected = contract.connect(signer);

    // Simulate the call first so a rejected require() returns its reason
    // without spending gas or sending a transaction.
    await simulate(connected);

    setStatus("pending", `${actionLabel} passed validation. Waiting for Anvil...`);

    const tx = await send(connected);

    setStatus(
      "pending",
      `Transaction ${shortHash(tx.hash)} sent. Waiting for confirmation from Anvil...`
    );

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction reverted");
    }

    setStatus(
      "success",
      `${actionLabel} confirmed in block ${receipt.blockNumber}. The contract emitted NumberChanged. Tx ${shortHash(
        tx.hash
      )}.`
    );

    dom.numberInput.value = "";
    await refreshState();
  } catch (error) {
    setStatus("error", explainTransactionError(error));
  } finally {
    setBusy(false);
  }
}

async function handleIncrement() {
  await runTransaction(
    "increment",
    (connected) => connected.increment.staticCall(),
    (connected) => connected.increment()
  );
}

async function handleSetNumber() {
  if (busy || !contract) return;

  const raw = dom.numberInput.value.trim();

  if (!/^\d+$/.test(raw)) {
    setStatus("error", "Enter a whole number between 0 and 100.");
    return;
  }

  const value = BigInt(raw);

  if (value > maxValue) {
    setStatus("error", `Rejected before sending: the contract limit is ${maxValue}.`);
    return;
  }

  await runTransaction(
    "set",
    (connected) => connected.setNumber.staticCall(value),
    (connected) => connected.setNumber(value)
  );
}

async function copyOwner() {
  if (!owner) return;

  try {
    await navigator.clipboard.writeText(owner);
    dom.copyOwner.textContent = "Copied";
    setTimeout(() => {
      dom.copyOwner.textContent = "Copy";
    }, 1400);
  } catch (error) {
    setStatus("error", "Could not copy the address. Select it manually instead.");
  }
}

async function manualRefresh() {
  if (!contract) {
    await init();
    return;
  }

  try {
    setStatus("pending", "Refreshing state from Anvil...");
    await refreshState();
    setStatus("success", "State refreshed from the local blockchain.");
  } catch (error) {
    setStatus("error", explainConnectionError(error));
  }
}

async function init() {
  setNetwork("loading", "Connecting to Anvil...");
  setStatus("pending", "Connecting to the local Anvil blockchain...");
  setControlsEnabled(false);

  try {
    deployment = await loadDeployment();

    provider = new JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    contract = new Contract(deployment.address, abi, provider);

    const [accountList, ownerValue, numberValue, limitValue] = await Promise.all([
      provider.send("eth_accounts", []),
      contract.owner(),
      contract.number(),
      contract.MAX_VALUE()
    ]);

    if (!accountList.length) {
      throw new Error("No unlocked local accounts were returned by Anvil.");
    }

    accounts = accountList;
    owner = ownerValue;
    maxValue = BigInt(limitValue);

    dom.chainId.textContent = `Chain ${network.chainId}`;
    renderNumber(numberValue);
    renderOwner();
    renderAccounts(accounts);
    await loadEvents();

    setNetwork("online", `Anvil · Chain ${network.chainId}`);
    setStatus(
      "success",
      "Connected to local Anvil. Use Account #0 (the owner) to change the counter, or Account #1 to see access control reject the call."
    );
    setControlsEnabled(true);
  } catch (error) {
    setNetwork("offline", "Anvil offline");
    setControlsEnabled(false);
    setStatus("error", explainConnectionError(error));
    dom.eventsList.replaceChildren(
      makeEmptyState("Waiting for a local deployment. Run ./start-local.sh from the project root.")
    );
  }
}

dom.incrementBtn.addEventListener("click", handleIncrement);
dom.setBtn.addEventListener("click", handleSetNumber);
dom.numberInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleSetNumber();
});
dom.accountSelect.addEventListener("change", () => {
  selectedAccount = dom.accountSelect.value;
  updateAccountMeta();
});
dom.refreshBtn.addEventListener("click", manualRefresh);
dom.copyOwner.addEventListener("click", copyOwner);

init();
