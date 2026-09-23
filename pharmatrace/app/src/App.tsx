import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseAbi,
  type Address,
} from "viem";

const ARC_CHAIN_ID = 5042;
const ARC_CHAIN_HEX = "0x13b2";
const ARC_RPC_URL = "https://rpc.mainnet.arc.io";
const ARC_EXPLORER_URL = "https://explorer.arc.io";
const CONTRACT_ADDRESS = (import.meta.env.VITE_PHARMATRACE_CONTRACT_ADDRESS || "") as Address;

const arc = {
  id: ARC_CHAIN_ID,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC_URL] } },
  blockExplorers: { default: { name: "Arc Explorer", url: ARC_EXPLORER_URL } },
} as const;

const abi = parseAbi([
  "function registerBatch(string batchId,string drugName,string manufacturer,string manufactureDate,string expiryDate,uint256 quantity) returns (bytes32 batchKey)",
  "function verifyBatch(string batchId) view returns (bool exists,string drugId,string drugName,string manufacturer,string manufactureDate,string expiryDate,uint256 quantity,uint8 status,address authority,uint256 registeredAt)",
  "function updateStatus(string batchId,uint8 status)",
  "function flagBatch(string batchId)",
  "function owner() view returns (address)",
]);

const samples = [
  { batchId: "NAFDAC04-2220", drugName: "Amoxicillin 500mg Capsules", manufacturer: "Emzor Pharmaceuticals Ltd", manufactureDate: "2026-01-10", expiryDate: "2028-01-10", quantity: "50000" },
  { batchId: "NAFDAC04-0829", drugName: "Paracetamol 500mg Tablets", manufacturer: "May & Baker Nigeria Plc", manufactureDate: "2026-02-01", expiryDate: "2028-02-01", quantity: "100000" },
];

const publicClient = createPublicClient({ chain: arc, transport: http(ARC_RPC_URL) });

type Form = (typeof samples)[number];

function shorten(value?: string) {
  return value ? value.slice(0, 10) + "..." + value.slice(-8) : "";
}

export default function App() {
  const [account, setAccount] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [tab, setTab] = useState<"verify" | "register">("verify");
  const [lookupId, setLookupId] = useState("");
  const [result, setResult] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Form>(samples[0]);
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState("");

  const walletClient = useMemo(
    () => window.ethereum ? createWalletClient({ chain: arc, transport: custom(window.ethereum) }) : undefined,
    []
  );

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_chainId" }).then((id) => setChainId(Number(id)));
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      const first = (accounts as string[])[0];
      if (first) setAccount(first as Address);
    });
  }, []);

  async function addArc() {
    if (!window.ethereum) throw new Error("Install MetaMask or another EVM wallet first.");
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: ARC_CHAIN_HEX,
        chainName: "Arc",
        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
        rpcUrls: [ARC_RPC_URL],
        blockExplorerUrls: [ARC_EXPLORER_URL],
      }],
    });
    setChainId(ARC_CHAIN_ID);
  }

  async function connect() {
    setError("");
    if (!window.ethereum) {
      setError("No EVM wallet detected. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
    setAccount(accounts[0] as Address);
    const id = Number(await window.ethereum.request({ method: "eth_chainId" }));
    setChainId(id);
    if (id !== ARC_CHAIN_ID) await addArc();
  }

  async function verify() {
    if (!CONTRACT_ADDRESS) {
      setError("Contract address is not configured. Deploy the Phase 1 registry and set VITE_PHARMATRACE_CONTRACT_ADDRESS.");
      return;
    }
    setLoading(true); setError(""); setResult(undefined);
    try {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS, abi, functionName: "verifyBatch", args: [lookupId.trim()],
      });
      const [exists, drugId, drugName, manufacturer, manufactureDate, expiryDate, quantity, status, authority, registeredAt] = data as any;
      setResult(exists ? {
        type: "found",
        data: { drugId, drugName, manufacturer, manufactureDate, expiryDate, quantity: quantity.toString(), status: Number(status), authority, registeredAt: registeredAt.toString() },
      } : { type: "notfound" });
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Blockchain query failed.");
    } finally { setLoading(false); }
  }

  async function register() {
    if (!walletClient || !account) { setError("Connect an EVM wallet first."); return; }
    if (!CONTRACT_ADDRESS) { setError("Contract address is not configured yet."); return; }
    setLoading(true); setError(""); setTxHash(undefined);
    try {
      const id = Number(await window.ethereum!.request({ method: "eth_chainId" }));
      if (id !== ARC_CHAIN_ID) {
        await addArc();
        throw new Error("Switch to Arc and press Register again.");
      }
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS, abi, functionName: "registerBatch",
        args: [form.batchId.trim(), form.drugName.trim(), form.manufacturer.trim(), form.manufactureDate, form.expiryDate, BigInt(form.quantity)],
        account, chain: arc,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setResult({ type: "registered", batchId: form.batchId });
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Registration failed.");
    } finally { setLoading(false); }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07110f", color: "#e5e7eb", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <section style={{ maxWidth: 760, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div>
            <div style={{ color: "#6ee7b7", fontSize: 12, fontWeight: 800, letterSpacing: 1.5 }}>PHARMATRACE</div>
            <h1 style={{ margin: "5px 0", fontSize: 30 }}>Verify pharmaceutical provenance on Arc</h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>Nigeria · Arc mainnet · onchain batch registry</p>
          </div>
          <button onClick={connect} style={buttonStyle("#6ee7b7", "#062e1f")}>{account ? shorten(account) : "Connect wallet"}</button>
        </header>

        {chainId && chainId !== ARC_CHAIN_ID && <div style={warning}>Wrong network. PharmaTrace uses Arc (chain ID {ARC_CHAIN_ID}).</div>}
        {!CONTRACT_ADDRESS && <div style={warning}>Phase 1 contract address is not configured yet. Deploy the registry and set VITE_PHARMATRACE_CONTRACT_ADDRESS.</div>}
        {error && <div style={errorStyle}>{error}</div>}

        <div style={{ display: "flex", gap: 8, margin: "22px 0" }}>
          <button onClick={() => setTab("verify")} style={buttonStyle(tab === "verify" ? "#6ee7b7" : "#17231f", tab === "verify" ? "#062e1f" : "#cbd5e1")}>Verify batch</button>
          <button onClick={() => setTab("register")} style={buttonStyle(tab === "register" ? "#6ee7b7" : "#17231f", tab === "register" ? "#062e1f" : "#cbd5e1")}>Register batch</button>
        </div>

        {tab === "verify" ? (
          <div style={card}>
            <p style={{ color: "#94a3b8" }}>Enter a NAFDAC batch ID and query the Arc registry directly.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {samples.map((s) => <button key={s.batchId} onClick={() => setLookupId(s.batchId)} style={smallButton}>{s.batchId}</button>)}
            </div>
            <input value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="NAFDAC batch ID" style={inputStyle} />
            <button disabled={loading || !lookupId.trim()} onClick={verify} style={buttonStyle("#6ee7b7", "#062e1f")}>{loading ? "Querying Arc..." : "Verify on Arc"}</button>

            {result?.type === "found" && <div style={success}><h3>✓ Batch found on Arc</h3>{Object.entries(result.data).map(([k, v]) => <div key={k} style={row}><span>{k}</span><strong>{String(v)}</strong></div>)}</div>}
            {result?.type === "notfound" && <div style={danger}><h3>Batch not found</h3><p>No PharmaTrace registry record was found for this batch ID. This result alone does not establish that a medicine is counterfeit; use the appropriate regulatory verification/reporting process.</p></div>}
          </div>
        ) : (
          <div style={card}>
            <p style={{ color: "#94a3b8" }}>Register an authorized pharmaceutical batch in the Arc registry.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>{samples.map((s) => <button key={s.batchId} onClick={() => setForm(s)} style={smallButton}>{s.drugName.split(" ")[0]}</button>)}</div>
            {(["batchId", "drugName", "manufacturer", "manufactureDate", "expiryDate", "quantity"] as const).map((field) => <input key={field} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={field} style={inputStyle} />)}
            <button disabled={loading || !account} onClick={register} style={buttonStyle("#a7f3d0", "#052e1b")}>{loading ? "Waiting for wallet..." : "Register on Arc"}</button>
            {txHash && <div style={success}><h3>✓ Transaction confirmed</h3><a href={ARC_EXPLORER_URL + "/tx/" + txHash} target="_blank" rel="noreferrer">View transaction {shorten(txHash)}</a></div>}
          </div>
        )}
      </section>
    </main>
  );
}

const card: React.CSSProperties = { background: "#0d1915", border: "1px solid #1f3a30", borderRadius: 16, padding: 22 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 13, margin: "5px 0", borderRadius: 9, border: "1px solid #28453a", background: "#09120f", color: "#e5e7eb", fontSize: 14 };
const buttonStyle = (background: string, color: string): React.CSSProperties => ({ padding: "11px 16px", border: 0, borderRadius: 9, background, color, fontWeight: 800, cursor: "pointer" });
const smallButton: React.CSSProperties = { ...buttonStyle("#17231f", "#94a3b8"), fontSize: 12 };
const warning: React.CSSProperties = { padding: 12, marginTop: 12, borderRadius: 10, background: "#33260a", color: "#fcd34d" };
const errorStyle: React.CSSProperties = { padding: 12, marginTop: 12, borderRadius: 10, background: "#3b1010", color: "#fca5a5" };
const success: React.CSSProperties = { marginTop: 18, padding: 16, borderRadius: 12, background: "#09251a", border: "1px solid #1f8f60" };
const danger: React.CSSProperties = { marginTop: 18, padding: 16, borderRadius: 12, background: "#301212", border: "1px solid #8b3030" };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid #173127", fontSize: 13 };
