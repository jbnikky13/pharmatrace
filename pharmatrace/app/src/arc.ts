import { createPublicClient, createWalletClient, custom, http, type Address } from "viem";
import { arc } from "viem/chains";

export const ARC_USDC = "0x3600000000000000000000000000000000000000" as Address;
export const PHARMATRACE_ADDRESS = (import.meta.env.VITE_PHARMATRACE_ADDRESS || "0x842f77C115CB13b25225ccDCdbdD4E3e6323c58B") as Address;

export const publicClient = createPublicClient({
  chain: arc,
  transport: http(import.meta.env.VITE_ARC_RPC_URL || "https://rpc.mainnet.arc.io"),
});

export const registryAbi = [
  {type:"function",name:"getBatch",stateMutability:"view",inputs:[{name:"batchId",type:"string"}],outputs:[{name:"batch",type:"tuple",components:[
    {name:"batchId",type:"string"},{name:"drugName",type:"string"},{name:"manufacturer",type:"string"},
    {name:"manufactureDate",type:"string"},{name:"expiryDate",type:"string"},{name:"quantity",type:"uint256"},
    {name:"status",type:"uint8"},{name:"authority",type:"address"},{name:"custodian",type:"address"},
    {name:"registeredAt",type:"uint256"},{name:"exists",type:"bool"}]}]},
  {type:"function",name:"registerBatch",stateMutability:"nonpayable",inputs:[
    {name:"batchId",type:"string"},{name:"drugName",type:"string"},{name:"manufacturer",type:"string"},
    {name:"manufactureDate",type:"string"},{name:"expiryDate",type:"string"},{name:"quantity",type:"uint256"}],outputs:[{name:"batchKey",type:"bytes32"}]},
  {type:"function",name:"updateStatus",stateMutability:"nonpayable",inputs:[{name:"batchId",type:"string"},{name:"status",type:"uint8"}],outputs:[]},
  {type:"function",name:"flagBatch",stateMutability:"nonpayable",inputs:[{name:"batchId",type:"string"},{name:"reason",type:"string"}],outputs:[]},
  {type:"function",name:"applyForManufacturer",stateMutability:"nonpayable",inputs:[{name:"companyName",type:"string"},{name:"licenseNumber",type:"string"},{name:"contactReference",type:"string"}],outputs:[]},
  {type:"function",name:"getManufacturerApplication",stateMutability:"view",inputs:[{name:"account",type:"address"}],outputs:[{name:"application",type:"tuple",components:[{name:"wallet",type:"address"},{name:"companyName",type:"string"},{name:"licenseNumber",type:"string"},{name:"contactReference",type:"string"},{name:"status",type:"uint8"},{name:"submittedAt",type:"uint256"}]}]},
  {type:"function",name:"setManufacturerVerified",stateMutability:"nonpayable",inputs:[{name:"account",type:"address"},{name:"verified",type:"bool"}],outputs:[]},
  {type:"function",name:"getApplicantWallets",stateMutability:"view",inputs:[],outputs:[{name:"",type:"address[]"}]},
  {type:"function",name:"owner",stateMutability:"view",inputs:[],outputs:[{name:"",type:"address"}]},
  {type:"function",name:"manufacturerVerified",stateMutability:"view",inputs:[{name:"account",type:"address"}],outputs:[{name:"",type:"bool"}]},
  {type:"function",name:"authorizedRegistrars",stateMutability:"view",inputs:[{name:"account",type:"address"}],outputs:[{name:"",type:"bool"}]},
  {type:"function",name:"getBatchHistory",stateMutability:"view",inputs:[{name:"batchId",type:"string"}],outputs:[{name:"history",type:"tuple[]",components:[{name:"status",type:"uint8"},{name:"actor",type:"address"},{name:"timestamp",type:"uint256"},{name:"reason",type:"string"}]}]},
] as const;

function getBrowserProvider(): any {
  const provider = window.ethereum;
  if (!provider) throw new Error("No EVM wallet detected. Install MetaMask or another EVM wallet.");
  return provider;
}

export async function connectArcWallet(): Promise<Address> {
  const provider = getBrowserProvider();
  const client = createWalletClient({chain: arc, transport: custom(provider as any)});
  const [account] = await client.requestAddresses();
  const chainId = await client.getChainId();
  if (chainId !== arc.id) {
    try {
      await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x13b2"}]});
    } catch (switchError: any) {
      if (switchError?.code !== 4902) throw switchError;
      await provider.request({
        method:"wallet_addEthereumChain",
        params:[{
          chainId:"0x13b2",
          chainName:"Arc Mainnet",
          nativeCurrency:{name:"USDC",symbol:"USDC",decimals:6},
          rpcUrls:[import.meta.env.VITE_ARC_RPC_URL || "https://rpc.mainnet.arc.io"],
          blockExplorerUrls:["https://explorer.arc.io"]
        }]
      });
      await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x13b2"}]});
    }
  }
  return account;
}

export async function writeRegistry(functionName: string, args: readonly unknown[]) {
  const provider = getBrowserProvider();
  if (!PHARMATRACE_ADDRESS) throw new Error("VITE_PHARMATRACE_ADDRESS is not configured.");
  const walletClient = createWalletClient({chain:arc,transport:custom(provider as any)});
  const [account] = await walletClient.requestAddresses();
  return walletClient.writeContract({address:PHARMATRACE_ADDRESS,abi:registryAbi,functionName:functionName as any,args:args as any,account,chain:arc});
}

export const explorerTx = (tx:string) => `https://explorer.arc.io/tx/${tx}`;
export const explorerContract = () => PHARMATRACE_ADDRESS ? `https://explorer.arc.io/address/${PHARMATRACE_ADDRESS}` : "";
