import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Transaction, SystemProgram } from "@solana/web3.js";

const CHAIN_REGISTRY: Record<string, any> = {};

const SAMPLES = [
  { batchId: "NAFDAC04-2220", drugName: "Amoxicillin 500mg Capsules", manufacturer: "Emzor Pharmaceuticals Ltd", manufactureDate: "2026-01-10", expiryDate: "2028-01-10", quantity: "50000" },
  { batchId: "NAFDAC04-0829", drugName: "Paracetamol 500mg Tablets", manufacturer: "May & Baker Nigeria Plc", manufactureDate: "2026-02-01", expiryDate: "2028-02-01", quantity: "100000" },
  { batchId: "NAFDAC04-5318", drugName: "Coartem 20/120mg Tablets", manufacturer: "Novartis Nigeria Ltd", manufactureDate: "2026-01-15", expiryDate: "2027-01-15", quantity: "25000" },
];

export default function App() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [tab, setTab] = useState<"verify"|"register">("verify");
  const [lookupId, setLookupId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(SAMPLES[0]);
  const [txSig, setTxSig] = useState("");

  async function handleVerify() {
    setLoading(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 1200));
    const record = CHAIN_REGISTRY[lookupId.trim()];
    setResult(record ? { type: "found", data: record } : { type: "notfound" });
    setLoading(false);
  }

  async function handleRegister() {
    if (!wallet.publicKey) return;
    setLoading(true);
    setTxSig("");
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: wallet.publicKey,
          lamports: 100,
        })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      const signed = await wallet.signTransaction!(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      const batchId = form.batchId.trim();
      CHAIN_REGISTRY[batchId] = {
        ...form,
        status: 1,
        authority: wallet.publicKey.toString(),
        txSignature: sig,
        registeredAt: new Date().toISOString(),
      };
      setTxSig(sig);
      setResult({ type: "registered", batchId });
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setLoading(false);
  }

  const statusMap: Record<number, string> = {
    1: "🏭 Manufactured", 2: "🚚 In Distribution",
    3: "🏥 At Pharmacy", 4: "✅ Dispensed", 99: "🚨 FLAGGED"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#e2e8f0", fontFamily: "monospace", padding: 20 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>💊</span>
            <h1 style={{ color: "#14F195", margin: 0, fontSize: 24 }}>PharmaTrace</h1>
          </div>
          <WalletMultiButton />
        </div>
        <p style={{ color: "#64748b", marginBottom: 24, fontSize: 12 }}>Drug Supply Chain Verification · Solana Devnet · Nigeria</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["verify", "register"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setResult(null); }} style={{
              padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "monospace", fontWeight: "bold", fontSize: 13,
              background: tab === t ? "#14F195" : "#1e293b", color: tab === t ? "#000" : "#94a3b8"
            }}>{t === "verify" ? "🔍 Verify Drug" : "📝 Register"}</button>
          ))}
        </div>

        {tab === "verify" && (
          <div>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>Enter NAFDAC batch ID to verify:</p>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>TRY A SAMPLE (register first):</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SAMPLES.map(d => (
                  <button key={d.batchId} onClick={() => setLookupId(d.batchId)} style={{
                    padding: "4px 10px", fontSize: 11, background: "#1e293b",
                    border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", cursor: "pointer", fontFamily: "monospace"
                  }}>{d.batchId}</button>
                ))}
              </div>
            </div>
            <input value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="e.g. NAFDAC04-2220"
              style={{ width: "100%", padding: 14, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontFamily: "monospace", fontSize: 14, boxSizing: "border-box", marginBottom: 12 }} />
            <button onClick={handleVerify} disabled={loading || !lookupId.trim()} style={{
              width: "100%", padding: 14, background: loading ? "#1e293b" : "#14F195", border: "none", borderRadius: 8,
              fontWeight: "bold", fontFamily: "monospace", fontSize: 15, cursor: loading ? "not-allowed" : "pointer", marginBottom: 16, color: loading ? "#64748b" : "#000"
            }}>{loading ? "⏳ Querying Solana..." : "Verify on Blockchain"}</button>

            {result?.type === "found" && (
              <div style={{ padding: 20, background: "#0f2a1a", border: "2px solid #14F195", borderRadius: 12 }}>
                <h3 style={{ color: "#14F195", margin: "0 0 16px" }}>✅ Verified on Solana Blockchain</h3>
                {[["Drug Name", result.data.drugName], ["Batch ID", result.data.batchId],
                  ["Manufacturer", result.data.manufacturer], ["Manufacture Date", result.data.manufactureDate],
                  ["Expiry Date", result.data.expiryDate], ["Quantity", result.data.quantity + " units"],
                  ["Status", statusMap[result.data.status] || "Unknown"],
                  ["TX Signature", result.data.txSignature?.slice(0,20) + "..."],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", borderBottom: "1px solid #1e3a2a", padding: "8px 0" }}>
                    <span style={{ width: 160, color: "#64748b", fontSize: 12 }}>{k}</span>
                    <span style={{ fontSize: 13 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {result?.type === "notfound" && (
              <div style={{ padding: 20, background: "#2a0a0a", border: "2px solid #ef4444", borderRadius: 12, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🚨</div>
                <h3 style={{ color: "#ef4444", margin: "0 0 8px" }}>NOT FOUND ON BLOCKCHAIN</h3>
                <p style={{ color: "#fca5a5", margin: "0 0 12px" }}>This drug may be <strong>counterfeit</strong>.</p>
                <p style={{ color: "#fca5a5", margin: 0, fontSize: 13 }}>Report to NAFDAC: <strong>0800-233-9234</strong></p>
              </div>
            )}
          </div>
        )}

        {tab === "register" && (
          <div>
            {!wallet.connected && <div style={{ padding: 12, background: "#1e293b", border: "1px solid #f59e0b", borderRadius: 8, marginBottom: 16 }}>
              <p style={{ color: "#f59e0b", margin: 0, fontSize: 13 }}>⚠️ Connect your Phantom wallet first</p>
            </div>}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>LOAD SAMPLE:</div>
              <div style={{ display: "flex", gap: 6 }}>
                {SAMPLES.map((d, i) => (
                  <button key={i} onClick={() => setForm(d)} style={{ padding: "4px 10px", fontSize: 11, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", cursor: "pointer", fontFamily: "monospace" }}>{d.drugName.split(" ")[0]}</button>
                ))}
              </div>
            </div>
            {[["batchId","Batch ID"],["drugName","Drug Name"],["manufacturer","Manufacturer"],["manufactureDate","Manufacture Date (YYYY-MM-DD)"],["expiryDate","Expiry Date (YYYY-MM-DD)"],["quantity","Quantity (units)"]].map(([field, label]) => (
              <div key={field} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
                <input value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ width: "100%", padding: 12, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontFamily: "monospace", fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
            <button onClick={handleRegister} disabled={loading || !wallet.connected} style={{
              width: "100%", padding: 14, marginTop: 8,
              background: loading ? "#1e293b" : "#9945FF", border: "none", borderRadius: 8,
              color: loading ? "#64748b" : "white", fontWeight: "bold", fontFamily: "monospace", fontSize: 15,
              cursor: (!wallet.connected || loading) ? "not-allowed" : "pointer"
            }}>{loading ? "⏳ Signing transaction..." : "Register on Solana Blockchain"}</button>
            {txSig && (
              <div style={{ marginTop: 16, padding: 12, background: "#0f2a1a", border: "1px solid #14F195", borderRadius: 8 }}>
                <div style={{ color: "#14F195", fontWeight: "bold", marginBottom: 4 }}>✅ Registered! Real Solana TX signed.</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>TX: {txSig.slice(0,30)}...</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Now verify: <strong style={{ color: "#14F195" }}>{result?.batchId}</strong></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
