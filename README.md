# 💊 PharmaTrace

> **Onchain pharmaceutical provenance and USDC settlement for Nigeria, built on Arc.**

PharmaTrace lets authorized pharmaceutical participants register drug batches onchain, verify provenance from any phone, transfer custody through the supply chain, flag suspicious batches, and record USDC settlement events.

## Current architecture

- **Network:** Arc Mainnet (EVM, chain ID 5042)
- **Smart contract:** Solidity 0.8.24
- **Frontend:** React + TypeScript + Vite
- **Wallet:** EIP-1193 wallets such as MetaMask
- **RPC:** `https://rpc.mainnet.arc.io`
- **USDC:** Arc native USDC ERC-20 interface
- **Explorer:** `https://explorer.arc.io`

Arc uses USDC as its native gas token. The Arc ERC-20 interface for USDC is `0x3600000000000000000000000000000000000000`. The Arc documentation lists chain ID 5042, the mainnet RPC, and explorer. 

## What is onchain

The `PharmaTrace` contract provides:

- Batch registration with NAFDAC batch IDs
- Manufacturer/registrar authorization
- Public batch verification
- Supply-chain status updates
- Custody transfer
- Batch flagging
- USDC settlement recording
- Events suitable for indexing and analytics
- Duplicate batch protection

### Contract deployment

**Arc Mainnet contract:** _pending deployment_

After deployment, set:

```text
VITE_PHARMATRACE_ADDRESS=0x...
```

and add the same address to the grant application.

## Repository layout

```text
pharmatrace/
├── contracts/
│   └── PharmaTrace.sol
├── script/
│   └── DeployPharmaTrace.s.sol
├── test/
│   └── PharmaTrace.t.sol
├── foundry.toml
└── app/
    ├── src/
    │   ├── App.tsx
    │   ├── arc.ts
    │   └── main.tsx
    └── .env.example
```

The original Solana/Anchor prototype remains in the repository for migration history, but the active application path is now Arc/EVM.

## Local development

### Smart contract

Install Foundry, then:

```bash
cd pharmatrace
forge test -vvv
forge build
```

Testnet deployment:

```bash
export PRIVATE_KEY=YOUR_TESTNET_DEPLOYER_KEY
forge script script/DeployPharmaTrace.s.sol:DeployPharmaTrace \
  --rpc-url https://rpc.testnet.arc.io \
  --broadcast
```

Mainnet deployment:

```bash
export PRIVATE_KEY=YOUR_MAINNET_DEPLOYER_KEY
forge script script/DeployPharmaTrace.s.sol:DeployPharmaTrace \
  --rpc-url https://rpc.mainnet.arc.io \
  --broadcast
```

Never commit a private key.

### Frontend

```bash
cd pharmatrace/app
npm install
npm run dev
```

Create `.env.local`:

```env
VITE_ARC_RPC_URL=https://rpc.mainnet.arc.io
VITE_PHARMATRACE_ADDRESS=0xYOUR_PHARMATRACE_CONTRACT
```

The frontend reads verification data directly from the Arc contract; it no longer uses the old browser-only `CHAIN_REGISTRY`.

## Grant-ready roadmap

1. Deploy and verify the PharmaTrace contract on Arc Testnet.
2. Deploy the production contract to Arc Mainnet.
3. Add the deployed address and explorer link to this README.
4. Register controlled demo batches from an authorized wallet.
5. Demonstrate public verification from an unconnected wallet.
6. Demonstrate USDC settlement between supply-chain participants.
7. Add event indexing and participant dashboards.
8. Add QR/batch-label verification for consumers.

## Important product boundary

A missing onchain record is **not by itself proof that a medicine is counterfeit**. PharmaTrace is a provenance and verification layer; regulatory, packaging, seller, and laboratory checks remain important.

## License

MIT
