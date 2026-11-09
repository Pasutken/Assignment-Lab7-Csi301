import { bankAbi, bankAddress, infuraApiKey, student } from "./config.js";

const { Web3 } = window;
const SEPOLIA = "0xaa36a7";
const INFURA_RPC = "https://sepolia.infura.io/v3/";
const EXPLORER = "https://sepolia.etherscan.io";
const ADDRESS_KEY = "csi301-sepolia-bank-infura-address";
const $ = (id) => document.getElementById(id);

let wallet;
let infura;
let active;
let busy = false;
let walletChanged = false;
let configuredAddress = bankAddress.trim();
try {
  configuredAddress = localStorage.getItem(ADDRESS_KEY) || configuredAddress;
} catch {
  // The page still works when the browser blocks storage.
}

$("student-id").textContent = student.id || "รอกรอกข้อมูล";
$("student-name").textContent = student.name || "รอกรอกข้อมูล";
$("contract-address").value = configuredAddress;
updateExplorer();

window.addEventListener("eip6963:announceProvider", ({ detail }) => {
  if (detail?.info?.rdns === "io.metamask" && !wallet) {
    bindWallet(detail.provider);
    if (wallet) onWalletChange();
  }
});
window.dispatchEvent(new Event("eip6963:requestProvider"));

function bindWallet(provider) {
  if (wallet || !provider?.request) return;
  wallet = provider;
  wallet.on?.("accountsChanged", onWalletChange);
  wallet.on?.("chainChanged", onWalletChange);
  wallet.on?.("disconnect", onWalletChange);
}

function bindInjectedWallet() {
  if (wallet) return;
  const injected = window.ethereum;
  bindWallet(injected?.providers?.find((provider) => provider.isMetaMask) ?? (injected?.isMetaMask ? injected : undefined));
}

function onWalletChange() {
  if (!infura) return;
  active = undefined;
  $("balance").textContent = "—";
  $("account").textContent = "กำลังตรวจสอบบัญชี";
  walletChanged = true;
  renderControls();
  if (!busy) void run(sync);
}

function renderControls() {
  $("connect").disabled = busy || !infura || Boolean(active);
  $("connect").textContent = active ? "เชื่อม MetaMask แล้ว" : "เชื่อม MetaMask";
  for (const id of ["refresh", "deposit", "withdraw"]) $(id).disabled = busy || !active;
  $("contract-address").disabled = busy;
  $("save-address").disabled = busy;
}

function status(text, tone = "info") {
  $("status").textContent = text;
  $("status").parentElement.dataset.tone = tone;
}

function getAddress(value) {
  if (!Web3.utils.isAddress(value)) throw new Error("Contract Address หรือที่อยู่บัญชีไม่ถูกต้อง");
  return Web3.utils.toChecksumAddress(value);
}

function updateExplorer() {
  const link = $("explorer");
  try {
    link.href = `${EXPLORER}/address/${getAddress(configuredAddress)}#code`;
    link.hidden = false;
  } catch {
    link.removeAttribute("href");
    link.hidden = true;
  }
}

function showTransaction(hash) {
  const link = $("transaction");
  link.hidden = !hash;
  if (hash) link.href = `${EXPLORER}/tx/${hash}`;
  else link.removeAttribute("href");
}

function errorMessage(error) {
  if (error.code === 4001 || error.cause?.code === 4001) return "ยกเลิกรายการใน MetaMask แล้ว";
  if (error.code === -32002) return "มีหน้าต่าง MetaMask รอให้ยืนยันอยู่";
  return error.reason || error.cause?.message || error.message || "ดำเนินการไม่สำเร็จ";
}

function createInfuraWeb3(value) {
  const key = /^(?:https:\/\/sepolia\.infura\.io\/v3\/)?([A-Za-z0-9_-]{16,128})\/?$/.exec(value.trim())?.[1];
  if (!key) throw new Error("ตรวจสอบ infuraApiKey ใน config.js ให้เป็น API Key หรือ HTTPS Endpoint ของ Infura Sepolia");

  const infuraUrl = `${INFURA_RPC}${key}`;
  return new Web3(new Web3.providers.HttpProvider(infuraUrl, { providerOptions: { redirect: "error" } }));
}

async function readBalance({ account, readContract }, block = "latest") {
  try {
    const wei = await readContract.methods.checkBlance().call({ from: account }, block);
    return Web3.utils.fromWei(wei, "ether");
  } catch {
    throw new Error("Infura อ่านยอดไม่สำเร็จ ตรวจสอบ Contract Address, ABI และสิทธิ์ eth_call");
  }
}

async function run(action) {
  if (busy) return;
  busy = true;
  renderControls();
  try {
    await action();
  } catch (error) {
    status(errorMessage(error), "error");
  } finally {
    busy = false;
    renderControls();
    if (walletChanged) void run(sync);
  }
}

async function sync() {
  walletChanged = false;
  if (!infura) return;
  active = undefined;
  $("balance").textContent = "—";
  $("account").textContent = "ยังไม่เชื่อมต่อ";
  const accounts = await wallet?.request({ method: "eth_accounts" });
  if (!accounts?.length) return status("Infura พร้อมใช้งานบน Sepolia กดเชื่อม MetaMask เพื่อเริ่ม");

  const account = getAddress(accounts[0]);
  $("account").textContent = account;
  const chain = await wallet.request({ method: "eth_chainId" });
  if (chain !== SEPOLIA) return status("กดเชื่อม MetaMask เพื่อสลับไป Sepolia Testnet", "error");
  if (!configuredAddress) {
    document.querySelector(".settings").open = true;
    return status("เชื่อม MetaMask แล้ว กรุณาตั้งค่า Contract Address ของ Bank บน Sepolia");
  }

  const address = getAddress(configuredAddress);
  const code = await infura.eth.getCode(address).catch(() => {
    throw new Error("Infura ตรวจสัญญาไม่สำเร็จ ตรวจสอบการตั้งค่าและสิทธิ์ eth_getCode");
  });
  if (code === "0x") {
    throw new Error("ไม่พบสัญญาที่ Contract Address นี้บน Sepolia");
  }
  const readContract = new infura.eth.Contract(bankAbi, address);
  const walletWeb3 = new Web3(wallet);
  const writeContract = new walletWeb3.eth.Contract(bankAbi, address);
  const connection = { account, readContract, writeContract };
  const balance = await readBalance(connection);
  if (walletChanged) return;
  active = connection;
  $("balance").textContent = balance;
  status("เชื่อม MetaMask และอ่านยอดจาก Infura แล้ว");
}

async function connect() {
  bindInjectedWallet();
  if (!wallet) throw new Error("เปิดเว็บนี้ในเบราว์เซอร์ที่ติดตั้ง MetaMask");
  status("รอการเชื่อมต่อจาก MetaMask");
  await wallet.request({ method: "eth_requestAccounts" });
  if (await wallet.request({ method: "eth_chainId" }) !== SEPOLIA) {
    await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA }] });
  }
  await sync();
}

async function checkBalance() {
  const current = active;
  const balance = await readBalance(current);
  if (current === active) {
    $("balance").textContent = balance;
    status("อัปเดตยอดเงินจาก Infura แล้ว");
  }
}

function readAmount() {
  const value = $("amount").value.trim();
  if (!/^(?:\d+(?:\.\d{1,18})?|\.\d{1,18})$/.test(value)) {
    throw new Error("กรอกจำนวน ETH เป็นตัวเลข ทศนิยมได้สูงสุด 18 ตำแหน่ง");
  }
  const amount = Web3.utils.toWei(value.startsWith(".") ? `0${value}` : value, "ether");
  if (BigInt(amount) <= 0n) throw new Error("จำนวนเงินต้องมากกว่า 0 ETH");
  return amount;
}

async function transfer(isDeposit) {
  const current = active;
  showTransaction();
  const amount = readAmount();
  const chain = await wallet.request({ method: "eth_chainId" });
  const [account] = await wallet.request({ method: "eth_accounts" });
  if (current !== active || chain !== SEPOLIA || account?.toLowerCase() !== current.account.toLowerCase()) {
    throw new Error("บัญชีหรือเครือข่ายเปลี่ยน กรุณาตรวจสอบ MetaMask แล้วลองอีกครั้ง");
  }

  status("ตรวจสอบรายการแล้วกดยืนยันใน MetaMask");
  const methods = current.writeContract.methods;
  const transaction = isDeposit
    ? methods.deposit().send({ from: account, value: amount })
    : methods.withdraw(amount).send({ from: account });
  transaction.on("transactionHash", (hash) => {
    showTransaction(hash);
    status("ส่งธุรกรรมแล้ว กำลังรอผลบน Sepolia");
  });
  const receipt = await transaction;

  $("amount").value = "";
  const action = isDeposit ? "ฝากเงิน" : "ถอนเงิน";
  if (current === active) {
    try {
      const balance = await readBalance(current, receipt.blockNumber);
      if (current === active) $("balance").textContent = balance;
    } catch {
      if (current === active) $("balance").textContent = "—";
      return status(`${action}สำเร็จ กดตรวจสอบยอดเพื่ออัปเดตยอดเงิน`);
    }
  }
  status(`${action}สำเร็จ`);
}

$("connect").addEventListener("click", () => void run(connect));
$("refresh").addEventListener("click", () => void run(checkBalance));
$("deposit").addEventListener("click", () => void run(() => transfer(true)));
$("withdraw").addEventListener("click", () => void run(() => transfer(false)));
$("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void run(async () => {
    const entered = $("contract-address").value.trim();
    if (!/^0x[0-9a-f]{40}$/i.test(entered)) throw new Error("กรอก Contract Address รูปแบบ 0x ตามด้วยเลขฐานสิบหก 40 ตัว");
    configuredAddress = getAddress(entered);
    $("contract-address").value = configuredAddress;
    try {
      localStorage.setItem(ADDRESS_KEY, configuredAddress);
    } catch {
      // The address remains active for this page session.
    }
    updateExplorer();
    showTransaction();
    await sync();
  });
});

void run(async () => {
  if (!Web3) throw new Error("โหลด Web3.js ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้าใหม่");
  if (!infuraApiKey.trim()) throw new Error("ใส่ Infura API Key ใน config.js แล้วโหลดหน้าใหม่");
  const web3 = createInfuraWeb3(infuraApiKey);
  status("กำลังเชื่อม Infura บน Sepolia");
  const chainId = await web3.eth.getChainId().catch(() => {
    throw new Error("ติดต่อ Infura ไม่สำเร็จ ตรวจสอบ API Key, Sepolia และ Origins allowlist");
  });
  if (chainId !== BigInt(SEPOLIA)) throw new Error("Infura RPC ไม่ได้เชื่อมกับ Sepolia");
  infura = web3;
  bindInjectedWallet();
  await sync();
});
