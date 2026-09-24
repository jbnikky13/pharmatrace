import { useState } from "react";
import { createWalletClient, custom, keccak256, toBytes, type Address } from "viem";
import { arc } from "viem/chains";
import { publicClient, PHARMATRACE_ADDRESS, MIGRATION_ADDRESS, migrationAbi, explorerTx } from "./arc";

type Props = { account: Address | null };

export default function MigrationPanel({ account }: Props) {
  const [batchId, setBatchId] = useState("NAFDAC04-2220");
  const [sourceProgram, setSourceProgram] = useState("4rJojVK6QajDMFy14dpyKomvjJp3DLhkNHRpB1gygY7e");
  const [sourceRecord, setSourceRecord] = useState("");
  const [sourceTransaction, setSourceTransaction] = useState("");
  const [sourceHash, setSourceHash] = useState("");
  const [migration, setMigration] = useState<any>(null);
  const [tx, setTx] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadMigration() {
    setError("");
    try {
      if (!MIGRATION_ADDRESS) throw new Error("Migration registry is not deployed/configured yet.");
      const key = keccak256(toBytes(batchId.trim()));
      const m = await publicClient.readContract({ address: MIGRATION_ADDRESS, abi: migrationAbi, functionName: "getMigration", args: [key] });
      setMigration(m);
    } catch (e: any) {
      setMigration(null);
      setError(e?.shortMessage || e?.message || "Migration lookup failed.");
    }
  }

  async function recordMigration() {
    setLoading(true);
    setError("");
    setTx("");
    try {
      if (!MIGRATION_ADDRESS) throw new Error("Set VITE_PHARMATRACE_MIGRATION_ADDRESS after deploying the migration registry.");
      if (!PHARMATRACE_ADDRESS) throw new Error("PharmaTrace contract address is not configured.");
      if (!account) throw new Error("Connect the attestor wallet first.");
      if (!sourceRecord.trim() || !sourceTransaction.trim() || !sourceProgram.trim()) throw new Error("Complete all Solana source fields.");
      if (!/^0x[a-fA-F0-9]{64}$/.test(sourceHash.trim())) throw new Error("Source record hash must be a 32-byte hex value starting with 0x.");

      const wallet = createWalletClient({ chain: arc, transport: custom(window.ethereum as any) });
      const key = keccak256(toBytes(batchId.trim()));
      const hash = await wallet.writeContract({
        address: MIGRATION_ADDRESS,
        abi: migrationAbi,
        functionName: "recordMigration",
        args: [key, sourceProgram.trim(), sourceRecord.trim(), sourceTransaction.trim(), sourceHash.trim() as any],
        account,
        chain: arc
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTx(hash);
      await loadMigration();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Migration recording failed.");
    } finally {
      setLoading(false);
    }
  }

  return <section>
    <h2 style={{marginTop:0}}>Solana → Arc migration</h2>
    <p style={{color:"#94a3b8"}}>Link an existing Solana provenance record to its Arc batch without rewriting the original history. Only an authorized migration attestor can create this relationship.</p>
    {!MIGRATION_ADDRESS && <div style={{padding:12,marginBottom:12,background:"#2a1d0a",border:"1px solid #92400e",borderRadius:10,color:"#fde68a"}}>Migration registry is not deployed yet. Configure VITE_PHARMATRACE_MIGRATION_ADDRESS after the Arc deployment.</div>}
    <input value={batchId} onChange={e=>setBatchId(e.target.value)} placeholder="Arc batch ID" style={input}/>
    <input value={sourceProgram} onChange={e=>setSourceProgram(e.target.value)} placeholder="Solana program ID" style={input}/>
    <input value={sourceRecord} onChange={e=>setSourceRecord(e.target.value)} placeholder="Original Solana record / PDA" style={input}/>
    <input value={sourceTransaction} onChange={e=>setSourceTransaction(e.target.value)} placeholder="Original Solana transaction signature" style={input}/>
    <input value={sourceHash} onChange={e=>setSourceHash(e.target.value)} placeholder="Source record hash: 0x + 64 hex characters" style={input}/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button onClick={loadMigration} disabled={loading || !MIGRATION_ADDRESS} style={btn}>Check migration</button>
      <button onClick={recordMigration} disabled={loading || !MIGRATION_ADDRESS || !account} style={primary}>{loading ? "Recording…" : "Record migration on Arc"}</button>
    </div>
    {error && <div style={errorBox}>{error}</div>}
    {tx && <div style={card}><strong>✅ Migration attestation confirmed</strong><div style={{marginTop:8}}><a href={explorerTx(tx)} target="_blank" rel="noreferrer" style={{color:"#7dd3fc"}}>View Arc transaction ↗</a></div></div>}
    {migration?.exists && <div style={card}><h3 style={{marginTop:0,color:"#14F195"}}>🌉 Migrated provenance</h3>
      <Row k="Arc batch" v={batchId}/>
      <Row k="Source chain" v="Solana"/>
      <Row k="Solana program" v={migration.sourceProgram}/>
      <Row k="Original record" v={migration.sourceRecord}/>
      <Row k="Original transaction" v={migration.sourceTransaction}/>
      <Row k="Source record hash" v={migration.sourceRecordHash}/>
      <Row k="Attestor" v={migration.attestor}/>
      <Row k="Recorded" v={new Date(Number(migration.migratedAt)*1000).toLocaleString()}/>
    </div>}
  </section>;
}

const input: React.CSSProperties={width:"100%",padding:12,margin:"7px 0",boxSizing:"border-box",background:"#0b1220",border:"1px solid #334155",borderRadius:9,color:"#fff"};
const btn: React.CSSProperties={padding:"10px 14px",background:"#172033",border:"1px solid #334155",borderRadius:9,color:"#fff",cursor:"pointer"};
const primary: React.CSSProperties={...btn,background:"#173b2b",borderColor:"#14F195"};
const errorBox: React.CSSProperties={padding:12,marginTop:12,background:"#35151a",border:"1px solid #7f1d1d",borderRadius:10,color:"#fecaca"};
const card: React.CSSProperties={marginTop:14,padding:14,background:"#0f2a1a",border:"1px solid #14F195",borderRadius:10};
function Row({k,v}:{k:string;v:any}){return <div style={{display:"flex",justifyContent:"space-between",gap:12,padding:"7px 0",borderTop:"1px solid #20382a",fontSize:12}}><span style={{color:"#94a3b8"}}>{k}</span><span style={{textAlign:"right",wordBreak:"break-all"}}>{String(v)}</span></div>}
