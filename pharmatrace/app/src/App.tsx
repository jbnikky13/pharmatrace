import { useState } from "react";
import { createPublicClient, createWalletClient, custom, http, type Address } from "viem";
import { arc } from "viem/chains";
import { PHARMATRACE_ADDRESS, explorerContract, explorerTx, registryAbi } from "./arc";

const SAMPLES = [
  { batchId:"NAFDAC04-2220", drugName:"Amoxicillin 500mg Capsules", manufacturer:"Emzor Pharmaceuticals Ltd", manufactureDate:"2026-01-10", expiryDate:"2028-01-10", quantity:"50000" },
  { batchId:"NAFDAC04-0829", drugName:"Paracetamol 500mg Tablets", manufacturer:"May & Baker Nigeria Plc", manufactureDate:"2026-02-01", expiryDate:"2028-02-01", quantity:"100000" },
  { batchId:"NAFDAC04-5318", drugName:"Coartem 20/120mg Tablets", manufacturer:"Novartis Nigeria Ltd", manufactureDate:"2026-01-15", expiryDate:"2027-01-15", quantity:"25000" }
];
const publicClient=createPublicClient({chain:arc,transport:http(import.meta.env.VITE_ARC_RPC_URL||"https://rpc.mainnet.arc.io")});
const statusMap:Record<number,string>={1:"🏭 Manufactured",2:"🚚 In Distribution",3:"🏥 At Pharmacy",4:"✅ Dispensed",99:"🚨 Flagged"};

async function ensureArcNetwork() {
  if (!window.ethereum) throw new Error("No EVM wallet detected.");
  try {
    await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x13b2"}]});
  } catch (e:any) {
    if (e?.code !== 4902) throw e;
    await window.ethereum.request({
      method:"wallet_addEthereumChain",
      params:[{
        chainId:"0x13b2",
        chainName:"Arc Mainnet",
        nativeCurrency:{name:"USDC",symbol:"USDC",decimals:6},
        rpcUrls:[import.meta.env.VITE_ARC_RPC_URL || "https://rpc.mainnet.arc.io"],
        blockExplorerUrls:["https://explorer.arc.io"]
      }]
    });
    await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x13b2"}]});
  }
}

export default function App(){
 const [tab,setTab]=useState<"verify"|"register">("verify"),[lookupId,setLookupId]=useState(""),[result,setResult]=useState<any>(null),[loading,setLoading]=useState(false),[account,setAccount]=useState<Address|null>(null),[form,setForm]=useState(SAMPLES[0]),[error,setError]=useState(""),[action,setAction]=useState<"status"|"flag"|null>(null),[flagReason,setFlagReason]=useState("");
 async function connectWallet(){setError("");try{if(!window.ethereum)throw new Error("Install MetaMask or another EVM wallet.");const wc=createWalletClient({chain:arc,transport:custom(window.ethereum)});const[a]=await wc.requestAddresses();if(await wc.getChainId()!==arc.id) await ensureArcNetwork(); setAccount(a)}catch(e:any){setError(e?.shortMessage||e?.message||"Wallet connection failed.")}}
 async function handleVerify(){setLoading(true);setError("");setResult(null);try{if(!PHARMATRACE_ADDRESS)throw new Error("The deployed PharmaTrace contract address is not configured.");const b=await publicClient.readContract({address:PHARMATRACE_ADDRESS,abi:registryAbi,functionName:"getBatch",args:[lookupId.trim()]});setResult((b as any).exists?{type:"found",data:b}:{type:"notfound"})}catch(e:any){setError(e?.shortMessage||e?.message||"Blockchain lookup failed.")}finally{setLoading(false)}}
 async function handleBatchAction(kind:"status"|"flag",value:number|string){setLoading(true);setError("");try{if(!lookupId.trim())throw new Error("Enter a batch ID first.");if(!account)await connectWallet();const wc=createWalletClient({chain:arc,transport:custom(window.ethereum)});const[a]=await wc.requestAddresses();if(await wc.getChainId()!==arc.id)await ensureArcNetwork();const args=kind==="status"?[lookupId.trim(),value]:[lookupId.trim(),String(value)];const fn=kind==="status"?"updateStatus":"flagBatch";const tx=await wc.writeContract({address:PHARMATRACE_ADDRESS,abi:registryAbi,functionName:fn,args:args as any,account:a,chain:arc});await publicClient.waitForTransactionReceipt({hash:tx});setResult({type:"action",tx,action:kind});setAction(null);setFlagReason("");await handleVerify()}catch(e:any){setError(e?.shortMessage||e?.message||"Batch update failed.")}finally{setLoading(false)}}
 async function handleRegister(){setLoading(true);setError("");setResult(null);try{if(!PHARMATRACE_ADDRESS)throw new Error("Deploy the contract and set VITE_PHARMATRACE_ADDRESS first.");if(!window.ethereum)throw new Error("Install MetaMask or another EVM wallet.");const wc=createWalletClient({chain:arc,transport:custom(window.ethereum)});const[a]=await wc.requestAddresses();if(await wc.getChainId()!==arc.id) await ensureArcNetwork(); const ok=await publicClient.readContract({address:PHARMATRACE_ADDRESS,abi:registryAbi,functionName:"authorizedRegistrars",args:[a]});if(!ok)throw new Error("This wallet is not an authorized manufacturer/registrar.");const tx=await wc.writeContract({address:PHARMATRACE_ADDRESS,abi:registryAbi,functionName:"registerBatch",args:[form.batchId.trim(),form.drugName,form.manufacturer,form.manufactureDate,form.expiryDate,BigInt(form.quantity)],account:a,chain:arc});await publicClient.waitForTransactionReceipt({hash:tx});setResult({type:"registered",tx});setLookupId(form.batchId)}catch(e:any){setError(e?.shortMessage||e?.message||"Registration failed.")}finally{setLoading(false)}}
 return <div style={{minHeight:"100vh",background:"#07111f",color:"#e2e8f0",fontFamily:"Inter,system-ui,sans-serif",padding:20}}><div style={{maxWidth:760,margin:"0 auto"}}>
 <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16}}><div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:30}}>💊</span><h1 style={{color:"#14F195",margin:0,fontSize:25}}>PharmaTrace</h1></div><p style={{color:"#94a3b8",margin:"5px 0 0",fontSize:12}}>Drug provenance + USDC settlement · Arc Mainnet</p></div><button onClick={connectWallet} style={btn("#172033","#fff")}>{account?account.slice(0,6)+"…"+account.slice(-4):"Connect Wallet"}</button></header>
 <div style={{margin:"18px 0",padding:12,borderRadius:10,background:"#0d1b2d",border:"1px solid #20324b",fontSize:12}}><strong style={{color:"#14F195"}}>Arc Mainnet</strong> · Chain ID 5042 · Native gas: USDC {PHARMATRACE_ADDRESS&&<a href={explorerContract()} target="_blank" rel="noreferrer" style={{marginLeft:12,color:"#7dd3fc"}}>Contract ↗</a>}</div>
 <div style={{display:"flex",gap:8,marginBottom:20}}><button onClick={()=>{setTab("verify");setResult(null)}} style={tabBtn(tab==="verify")}>🔍 Verify Drug</button><button onClick={()=>{setTab("register");setResult(null)}} style={tabBtn(tab==="register")}>📝 Register Batch</button></div>
 {error&&<div style={{padding:14,marginBottom:16,background:"#35151a",border:"1px solid #7f1d1d",borderRadius:10,color:"#fecaca"}}>{error}</div>}
 {tab==="verify"&&<section><p style={{color:"#94a3b8"}}>Enter a NAFDAC batch ID and read the record directly from the Arc contract.</p><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{SAMPLES.map(s=><button key={s.batchId} onClick={()=>setLookupId(s.batchId)} style={chip}>{s.batchId}</button>)}</div><input value={lookupId} onChange={e=>setLookupId(e.target.value)} placeholder="e.g. NAFDAC04-2220" style={input}/><button onClick={handleVerify} disabled={loading||!lookupId.trim()} style={primary}>{loading?"Reading Arc…":"Verify on Arc"}</button>
 {result?.type==="found"&&<div style={card("#0f2a1a","#14F195")}><h3 style={{color:"#14F195"}}>✅ Batch record found on Arc</h3><Row k="Drug" v={result.data.drugName}/><Row k="Batch ID" v={result.data.batchId}/><Row k="Manufacturer" v={result.data.manufacturer}/><Row k="Manufactured" v={result.data.manufactureDate}/><Row k="Expiry" v={result.data.expiryDate}/><Row k="Quantity" v={result.data.quantity.toString()+" units"}/><Row k="Status" v={statusMap[Number(result.data.status)]||"Unknown"}/><Row k="Custodian" v={result.data.custodian}/></div>}
 {result?.type==="found"&&<div style={{marginTop:12,padding:14,background:"#0d1b2d",border:"1px solid #20324b",borderRadius:10}}><strong>Trace controls</strong><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{[[1,"Manufactured"],[2,"In Distribution"],[3,"At Pharmacy"],[4,"Dispensed"]].map(([v,label])=><button key={String(v)} disabled={loading} onClick={()=>handleBatchAction("status",v as number)} style={chip}>{label}</button>)}<button disabled={loading} onClick={()=>setAction("flag")} style={{...chip,borderColor:"#ef4444",color:"#fecaca"}}>🚨 Flag batch</button></div>{action==="flag"&&<div style={{marginTop:10}}><input value={flagReason} onChange={e=>setFlagReason(e.target.value)} placeholder="Reason for flagging" style={input}/><button disabled={loading||!flagReason.trim()} onClick={()=>handleBatchAction("flag",flagReason)} style={primary}>Submit Flag</button></div>}</div>}
 {result?.type==="action"&&<div style={card("#0f2a1a","#14F195")}><strong>✅ Blockchain update confirmed</strong><div style={{marginTop:8}}><a href={explorerTx(result.tx)} target="_blank" rel="noreferrer" style={{color:"#7dd3fc"}}>View transaction ↗</a></div></div>}
 {result?.type==="notfound"&&<div style={card("#2a0a0a","#ef4444")}><h3 style={{color:"#ef4444"}}>🚨 No batch record found</h3><p>This lookup did not find a registered batch on the PharmaTrace Arc contract. That alone does not establish that a medicine is counterfeit; verify packaging, seller, and regulatory information before taking action.</p></div>}</section>}
 {tab==="register"&&<section><p style={{color:"#94a3b8"}}>Authorized manufacturers can register a new pharmaceutical batch on Arc.</p>{Object.entries({batchId:"Batch ID",drugName:"Drug Name",manufacturer:"Manufacturer",manufactureDate:"Manufacture Date",expiryDate:"Expiry Date",quantity:"Quantity"}).map(([f,l])=><div key={f}><label style={{display:"block",fontSize:11,color:"#64748b"}}>{l}</label><input value={(form as any)[f]} onChange={e=>setForm(x=>({...x,[f]:e.target.value}))} style={input}/></div>)}<button onClick={handleRegister} disabled={loading||!account} style={primary}>{loading?"Confirming on Arc…":account?"Register Batch on Arc":"Connect Wallet First"}</button>{result?.type==="registered"&&<div style={card("#0f2a1a","#14F195")}><h3 style={{color:"#14F195"}}>✅ Batch registered</h3><a href={explorerTx(result.tx)} target="_blank" rel="noreferrer" style={{color:"#7dd3fc"}}>View Arc transaction ↗</a></div>}</section>}
 </div></div>
}
const input:React.CSSProperties={width:"100%",padding:13,background:"#111c2e",border:"1px solid #334155",borderRadius:8,color:"#e2e8f0",boxSizing:"border-box",margin:"5px 0 10px",fontSize:14};
const primary:React.CSSProperties={width:"100%",padding:14,background:"#14F195",color:"#03100a",border:0,borderRadius:9,fontWeight:800,cursor:"pointer",fontSize:14};
const chip:React.CSSProperties={padding:"5px 9px",fontSize:11,background:"#172033",border:"1px solid #334155",borderRadius:6,color:"#94a3b8",cursor:"pointer"};
const btn=(bg:string,color:string):React.CSSProperties=>({padding:"10px 14px",borderRadius:9,border:"1px solid #334155",background:bg,color,cursor:"pointer"});
const tabBtn=(active:boolean):React.CSSProperties=>({...btn(active?"#14F195":"#172033",active?"#03100a":"#94a3b8"),fontWeight:700});
const card=(background:string,border:string):React.CSSProperties=>({marginTop:18,padding:20,background,border:"2px solid "+border,borderRadius:12});
function Row({k,v}:{k:string,v:string}){return <div style={{display:"flex",gap:16,borderBottom:"1px solid #203329",padding:"8px 0"}}><span style={{width:125,color:"#64748b",fontSize:12}}>{k}</span><span style={{fontSize:13,wordBreak:"break-all"}}>{v}</span></div>}
