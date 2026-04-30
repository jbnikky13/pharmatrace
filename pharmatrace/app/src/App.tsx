import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "./idl/pharmatrace.json";

const PROGRAM_ID = new PublicKey("4rJojVK6QajDMFyi4dpyKomvjJp3DLhkNHRpBigygY7e");

const SAMPLE_DRUGS = [
  { batchId: "AMX-04-2220", drugName: "Amoxicillin 500mg Capsules", manufacturer: "Emzor Pharmaceuticals Ltd", manufactureDate: "2026-01-10", expiryDate: "2028-01-10", quantity: "50000" },
  { batchId: "PCT-04-0829", drugName: "Paracetamol 500mg Tablets", manufacturer: "May & Baker Nigeria Plc", manufactureDate: "2026-02-01", expiryDate: "2028-02-01", quantity: "100000" },
  { batchId: "CTM-04-5318", drugName: "Coartem 20/120mg Tablets", manufacturer: "Novartis Nigeria Ltd", manufactureDate: "2026-01-15", expiryDate: "2027-01-15", quantity: "25000" },
];

const statusMap: Record<number, string> = {
  1: "🏭 Manufactured",
  2: "🚚 In Distribution",
  3: "🏥 At Pharmacy",
  4: "✅ Dispensed",
  99: "🚨 FLAGGED — Suspected Counterfeit",
};

export default function App() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [tab, setTab] = useState<"verify" | "register">("verify");
  const [lookupId, setLookupId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(SAMPLE_DRUGS[0]);
  const [txSig, setTxSig] = useState("");

  function getProgram() {
    const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
    return new Program(idl as any, provider);
  }

  async function handleVerify() {
    setLoading(true);
    setResult(null);
    try {
      const program = getProgram();
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("drug"), Buffer.from(lookupId.trim())],
        PROGRAM_ID
      );
      const record = await (program.account as any).drugRecord.fetch(pda);
      setResult({ type: "found", data: record });
    } catch {
      setResult({ type: "notfound" });
    }
    setLoading(false);
  }

  async function handleRegister() {
    if (!wallet.publicKey) return;
    setLoading(true);
    setTxSig("");
    try {
      const program = getProgram();
      const batchId = form.batchId.trim();
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("drug"), Buffer.from(batchId)],
        PROGRAM_ID
      );
      const tx = await program.methods
        .registerDrug(
          batchId,
          form.drugName,
          form.manufacturer,
          form.manufactureDate,
          form.expiryDate,
          new BN(parseInt(form.quantity))
        )
        .accounts({
          drugRecord: pda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxSig(tx);
      setResult({ type: "registered", batchId });
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#e2e8f0", fontFamily: "monospace", padding: 20 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>💊</span>
            <h1 style={{ color: "#14F195", margin: 0, fontSize: 24 }}>PharmaTrace</h1>
          </div>
          <WalletMultiButton />
        </div>
        <p style={{ color: "#64748b", marginBottom: 24, fontSize: 12 }}>
          Drug Supply Chain Verification · Solana Devnet · Nigeria
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["verify", "register"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setResult(null); }} style={{
              padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "monospace", fontWeight: "bold", fontSize: 13,
              background: tab === t ? "#14F195" : "#1e293b",
              color: tab === t ? "#000" : "#94a3b8"
            }}>
              {t === "verify" ? "🔍 Verify Drug" : "📝 Register"}
            </button>
          ))}
        </div>

        {/* VERIFY TAB */}
        {tab === "verify" && (
          <div>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>
              Enter a NAFDAC batch ID to verify authenticity on Solana:
            </p>

            {/* Sample IDs to try */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>TRY A SAMPLE:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SAMPLE_DRUGS.map(d => (
                  <button key={d.batchId} onClick={() => setLookupId(d.batchId)} style={{
                    padding: "4px 10px", fontSize: 11, background: "#1e293b",
                    border: "1px solid #334155", borderRadius: 6,
                    color: "#94a3b8", cursor: "pointer", fontFamily: "monospace"
                  }}>{d.batchId}</button>
                ))}
              </div>
            </div>

            <input
              value={lookupId}
              onChange={e => setLookupId(e.target.value)}
              placeholder="e.g. AMX-04-2220"
              style={{
                width: "100%", padding: 14, background: "#1e293b",
                border: "1px solid #334155", borderRadius: 8,
                color: "#e2e8f0", fontFamily: "monospace", fontSize: 14,
                boxSizing: "border-box", marginBottom: 12
              }}
            />
            <button
              onClick={handleVerify}
              disabled={loading || !lookupId.trim()}
              style={{
                width: "100%", padding: 14, background: loading ? "#1e293b" : "#14F195",
                border: "none", borderRadius: 8, fontWeight: "bold",
                fontFamily: "monospace", fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer", marginBottom: 16,
                color: loading ? "#64748b" : "#000"
              }}>
              {loading ? "⏳ Checking blockchain..." : "Verify on Blockchain"}
            </button>

            {/* FOUND */}
            {result?.type === "found" && (
              <div style={{ padding: 20, background: "#0f2a1a", border: "2px solid #14F195", borderRadius: 12 }}>
                <h3 style={{ color: "#14F195", margin: "0 0 16px" }}>✅ Verified on Solana Blockchain</h3>
                {[
                  ["Drug Name", result.data.drugName],
                  ["Batch ID", result.data.batchId],
                  ["Manufacturer", result.data.manufacturer],
                  ["Manufacture Date", result.data.manufactureDate],
                  ["Expiry Date", result.data.expiryDate],
                  ["Quantity", result.data.quantity?.toString() + " units"],
                  ["Status", statusMap[result.data.status] || "Unknown"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", borderBottom: "1px solid #1e3a2a", padding: "8px 0" }}>
                    <span style={{ width: 160, color: "#64748b", fontSize: 12 }}>{k}</span>
                    <span style={{ fontSize: 13 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* NOT FOUND */}
            {result?.type === "notfound" && (
              <div style={{ padding: 20, background: "#2a0a0a", border: "2px solid #ef4444", borderRadius: 12, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🚨</div>
                <h3 style={{ color: "#ef4444", margin: "0 0 8px" }}>NOT FOUND ON BLOCKCHAIN</h3>
                <p style={{ color: "#fca5a5", margin: "0 0 12px" }}>
                  This drug has no verified record. It may be <strong>counterfeit</strong>.
                </p>
                <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>
                  <p style={{ color: "#fca5a5", margin: 0, fontSize: 13 }}>
                    ⚠️ DO NOT DISPENSE OR CONSUME<br />
                    Report to NAFDAC: <strong>0800-233-9234</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REGISTER TAB */}
        {tab === "register" && (
          <div>
            {!wallet.connected && (
              <div style={{ padding: 12, background: "#1e293b", border: "1px solid #f59e0b", borderRadius: 8, marginBottom: 16 }}>
                <p style={{ color: "#f59e0b", margin: 0, fontSize: 13 }}>
                  ⚠️ Connect your Phantom wallet to register drugs
                </p>
              </div>
            )}

            {/* Sample preset buttons */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>LOAD SAMPLE DRUG:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SAMPLE_DRUGS.map((d, i) => (
                  <button key={i} onClick={() => setForm(d)} style={{
                    padding: "4px 10px", fontSize: 11, background: "#1e293b",
                    border: "1px solid #334155", borderRadius: 6,
                    color: "#94a3b8", cursor: "pointer", fontFamily: "monospace"
                  }}>{d.drugName.split(" ")[0]}</button>
                ))}
              </div>
            </div>

            {[
              ["batchId", "Batch ID (e.g. AMX-04-2220)"],
              ["drugName", "Drug Name (e.g. Amoxicillin 500mg)"],
              ["manufacturer", "Manufacturer"],
              ["manufactureDate", "Manufacture Date (YYYY-MM-DD)"],
              ["expiryDate", "Expiry Date (YYYY-MM-DD)"],
              ["quantity", "Quantity (units)"],
            ].map(([field, placeholder]) => (
              <div key={field} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>{placeholder.split("(")[0]}</div>
                <input
                  value={(form as any)[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    width: "100%", padding: 12, background: "#1e293b",
                    border: "1px solid #334155", borderRadius: 8,
                    color: "#e2e8f0", fontFamily: "monospace", fontSize: 13,
                    boxSizing: "border-box"
                  }}
                />
              </div>
            ))}

            <button
              onClick={handleRegister}
              disabled={loading || !wallet.connected}
              style={{
                width: "100%", padding: 14, marginTop: 8,
                background: loading ? "#1e293b" : "#9945FF",
                border: "none", borderRadius: 8, color: loading ? "#64748b" : "white",
                fontWeight: "bold", fontFamily: "monospace", fontSize: 15,
                cursor: (!wallet.connected || loading) ? "not-allowed" : "pointer"
              }}>
              {loading ? "⏳ Registering on blockchain..." : "Register on Solana Blockchain"}
            </button>

            {txSig && (
              <div style={{ marginTop: 16, padding: 12, background: "#0f2a1a", border: "1px solid #14F195", borderRadius: 8 }}>
                <div style={{ color: "#14F195", fontWeight: "bold", marginBottom: 4 }}>✅ Registered successfully!</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>TX: {txSig.slice(0, 20)}...</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                  Now switch to Verify tab and search for: <strong style={{ color: "#14F195" }}>{result?.batchId}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}