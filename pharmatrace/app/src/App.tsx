import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "./idl/pharmatrace.json";

const PROGRAM_ID = new PublicKey("4rJojVK6QajDMFyi4dpyKomvjJp3DLhkNHRpBigygY7e");

export default function App() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [tab, setTab] = useState<"verify" | "register">("verify");
  const [lookupId, setLookupId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    batchId: "", drugName: "", manufacturer: "",
    manufactureDate: "", expiryDate: "", quantity: "",
  });

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
        [Buffer.from("drug"), Buffer.from(lookupId)],
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
    try {
      const program = getProgram();
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("drug"), Buffer.from(form.batchId)],
        PROGRAM_ID
      );
      await program.methods
        .registerDrug(form.batchId, form.drugName, form.manufacturer,
          form.manufactureDate, form.expiryDate, new BN(parseInt(form.quantity)))
        .accounts({ drugRecord: pda, authority: wallet.publicKey, systemProgram: SystemProgram.programId })
        .rpc();
      alert("Drug registered on Solana!");
      setForm({ batchId: "", drugName: "", manufacturer: "", manufactureDate: "", expiryDate: "", quantity: "" });
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
    <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#e2e8f0", fontFamily: "monospace", padding: 24 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h1 style={{ color: "#14F195", margin: 0 }}>💊 PharmaTrace</h1>
          <WalletMultiButton />
        </div>
        <p style={{ color: "#64748b", marginBottom: 24 }}>Drug Supply Chain Verification · Solana Devnet · Nigeria</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["verify", "register"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "monospace", fontWeight: "bold",
              background: tab === t ? "#14F195" : "#1e293b", color: tab === t ? "#000" : "#94a3b8"
            }}>{t === "verify" ? "🔍 Verify Drug" : "📝 Register"}</button>
          ))}
        </div>

        {tab === "verify" && (
          <div>
            <input value={lookupId} onChange={e => setLookupId(e.target.value)}
              placeholder="Enter Batch ID e.g. NAFDAC-2026-AMX-001"
              style={{ width: "100%", padding: 14, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontFamily: "monospace", fontSize: 14, boxSizing: "border-box", marginBottom: 12 }} />
            <button onClick={handleVerify} disabled={loading || !lookupId}
              style={{ width: "100%", padding: 14, background: "#14F195", border: "none", borderRadius: 8, fontWeight: "bold", fontFamily: "monospace", fontSize: 15, cursor: "pointer", marginBottom: 16 }}>
              {loading ? "Checking blockchain..." : "Verify on Blockchain"}
            </button>

            {result?.type === "found" && (
              <div style={{ padding: 20, background: "#0f2a1a", border: "2px solid #14F195", borderRadius: 12 }}>
                <h3 style={{ color: "#14F195", margin: "0 0 16px" }}>✅ Verified on Solana Blockchain</h3>
                {[["Drug Name", result.data.drugName], ["Batch ID", result.data.batchId],
                  ["Manufacturer", result.data.manufacturer], ["Manufacture Date", result.data.manufactureDate],
                  ["Expiry Date", result.data.expiryDate], ["Quantity", result.data.quantity?.toString()],
                  ["Status", statusMap[result.data.status] || "Unknown"]
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", borderBottom: "1px solid #1e3a2a", padding: "8px 0" }}>
                    <span style={{ width: 160, color: "#64748b", fontSize: 13 }}>{k}</span>
                    <span style={{ fontSize: 13 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {result?.type === "notfound" && (
              <div style={{ padding: 20, background: "#2a0a0a", border: "2px solid #ef4444", borderRadius: 12, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>🚨</div>
                <h3 style={{ color: "#ef4444" }}>NOT FOUND ON BLOCKCHAIN</h3>
                <p style={{ color: "#fca5a5" }}>This drug may be counterfeit. Do NOT dispense.</p>
                <p style={{ color: "#fca5a5" }}>Report to NAFDAC: <strong>0800-233-9234</strong></p>
              </div>
            )}
          </div>
        )}

        {tab === "register" && (
          <div>
            {!wallet.connected && <p style={{ color: "#f59e0b", padding: 12, background: "#1e293b", borderRadius: 8 }}>⚠️ Connect your wallet to register drugs</p>}
            {[["batchId", "Batch ID (e.g. NAFDAC-2026-AMX-001)"],
              ["drugName", "Drug Name (e.g. Amoxicillin 500mg)"],
              ["manufacturer", "Manufacturer"],
              ["manufactureDate", "Manufacture Date (YYYY-MM-DD)"],
              ["expiryDate", "Expiry Date (YYYY-MM-DD)"],
              ["quantity", "Quantity (units)"]
            ].map(([field, placeholder]) => (
              <input key={field} value={(form as any)[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={placeholder}
                style={{ width: "100%", padding: 12, marginBottom: 8, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontFamily: "monospace", boxSizing: "border-box" }} />
            ))}
            <button onClick={handleRegister} disabled={loading || !wallet.connected}
              style={{ width: "100%", padding: 14, background: "#9945FF", border: "none", borderRadius: 8, color: "white", fontWeight: "bold", fontFamily: "monospace", fontSize: 15, cursor: "pointer" }}>
              {loading ? "Registering..." : "Register on Solana Blockchain"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}