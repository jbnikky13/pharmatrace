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

**Arc Mainnet contract:** `0x6e6EeEAFcA49FD83400e2b03805006dFfC43C52E`  

**Grant submission status:** the Arc Mainnet contract is deployed and the frontend supports wallet connection, batch registration for authorized registrars, and public on-chain verification.

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

The repository contains the original Solana/Anchor prototype for migration history. The active production path is the Arc/EVM contract and React frontend.

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

The frontend reads verification data directly from the Arc contract and uses the EIP-1193 wallet interface; it no longer depends on the old browser-only `CHAIN_REGISTRY`.

## Grant-ready roadmap

1. Deploy and verify the production PharmaTrace contract on Arc Mainnet.
2. Add the deployed contract address and explorer link to this README and the grant application.
3. Register controlled demo batches from an authorized wallet.
4. Demonstrate public verification from an unconnected wallet.
5. Demonstrate custody/status updates and USDC settlement between supply-chain participants.
6. Publish a live demo URL and a short end-to-end transaction walkthrough.
7. Add event indexing and participant dashboards.
8. Add QR/batch-label verification for consumers.

## Important product boundary

A missing onchain record is **not by itself proof that a medicine is counterfeit**. PharmaTrace is a provenance and verification layer; regulatory, packaging, seller, and laboratory checks remain important.

## License

MIT


### Manufacturer onboarding
Manufacturers apply with a wallet and business/licence reference. The contract owner reviews the application; approval automatically grants registration rights. Public batch verification remains permissionless.


<!-- [deploy-arc] Harden registration authorization: verified manufacturers only -->


## Deployment gate — 2026-09-24T06:13:50.560Z
Final verified-manufacturer authorization and trace-control hardening is ready for Arc Mainnet deployment.


Deployment gate re-armed.
