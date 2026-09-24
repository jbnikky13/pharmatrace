# 💊 PharmaTrace

> **Onchain pharmaceutical provenance and USDC settlement for Nigeria, built on Arc.**

PharmaTrace lets authorized pharmaceutical participants register drug batches onchain, verify provenance from any phone, transfer custody through the supply chain, flag suspicious batches, and record USDC settlement events.

## Project history

### Phase 1 — Solana / Anchor prototype

PharmaTrace began as a Solana/Anchor prototype exploring onchain pharmaceutical batch provenance. The original implementation modeled batch identifiers, drug information, manufacturer data, dates, quantities, status, and authority controls.

The Solana implementation remains in the repository as development history and documents the original provenance model.

### Phase 2 — Arc Mainnet

The project evolved from the Solana prototype into the current EVM-based production implementation on Arc Mainnet.

The Arc implementation introduced manufacturer onboarding, owner approval, verified manufacturer wallets, public verification, custody and distribution tracing, pharmacy/dispensed states, batch flagging, USDC settlement recording, contract-level authorization, duplicate protection, and automated CI/deployment.

The Arc implementation is the current production path. The Solana code is retained as historical context; PharmaTrace does not claim that every historical Solana record was automatically bridged to Arc.

### Phase 3 — Production hardening

The project was subsequently hardened with persistent approval state, authorization regression coverage, EIP-1193 wallet handling, controlled deployment workflows, and frontend/contract CI.

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

**Arc Mainnet contract:** `0x41aBE791Cb924dBf5F4f2776c664491058eE1848`  

**Production status:** the final Arc Mainnet contract is deployed; manufacturer onboarding, owner-only approval, verified-manufacturer registration, public verification, distribution tracing, and batch flagging are implemented.

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

## Solana → Arc development history

The project should be understood as an evolution of its architecture:

```
Solana / Anchor prototype
        ↓
Original provenance model
        ↓
Architecture evolution
        ↓
Arc / EVM production implementation
        ↓
Expanded provenance + authorization + settlement
```

A separate Arc migration-attestation registry is deployed at:

**0x9957f91b25B2FE09C9399e74Ecb50fffF3d8A482**

This registry is an optional provenance-history mechanism. It does not mean that existing Solana records have automatically been migrated to Arc.

## v1.0.0 grant readiness

The production implementation now covers the core provenance workflow, authorization, tracing, settlement, security hardening, and automated testing/deployment.

Before tagging `v1.0.0`, the remaining work is release validation and evidence:

1. Run the complete contract test suite.
2. Run the production frontend build.
3. Verify the live Arc contract and frontend configuration.
4. Capture relevant Arc transaction/explorer evidence.
5. Perform the final grant-readiness audit.
6. Tag and publish `v1.0.0`.

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


## Manufacturer onboarding and authorization

Manufacturers connect an EIP-1193 wallet and submit a business/licence reference. The application is recorded onchain and reviewed by the contract owner. Approval automatically marks the wallet as a verified manufacturer and gives it batch-registration rights.

The Owner Review section is only visible when the connected wallet matches the contract's `owner()` address.

Registration is enforced by the smart contract: the contract owner or a verified manufacturer may register batches. An unverified wallet cannot bypass onboarding through a generic/manual registrar permission.

## Public verification and trace controls

Public batch verification is permissionless and does not require a wallet connection. Batch registration creates the initial **Manufactured** state automatically.

The verification interface is read-oriented. Mutable trace controls are limited to:

- **In Distribution**
- **At Pharmacy**
- **Dispensed**
- **Flag batch**

These controls are available only to an appropriate authorized wallet: the batch authority, current custodian, or contract owner. Other users can inspect the full trace history but cannot modify it.

## Current production contract

`0x41aBE791Cb924dBf5F4f2776c664491058eE1848`

Arc Mainnet · Chain ID `5042`

## Security and deployment updates

- Smart-contract authorization was hardened so verified-manufacturer status is the registration boundary.
- Regression coverage was added to prevent a generic registrar permission from bypassing manufacturer verification.
- Frontend wallet-provider handling was hardened for EIP-1193 wallets.
- The deployment workflow was corrected so controlled deployment commits trigger the Arc deployment pipeline.
- The frontend now uses the final production contract address.
- Frontend and contract CI/deployment workflows are passing.

## End-to-end acceptance flow

1. Connect a wallet and submit a manufacturer application.
2. Confirm the application remains pending after refresh.
3. Connect the contract-owner wallet and approve the applicant.
4. Reconnect the manufacturer wallet and register a test batch.
5. Connect an unrelated, unverified wallet and confirm registration is rejected.
6. Disconnect the wallet and publicly verify the batch.
7. Use an authorized trace wallet to move the batch through distribution states.
8. Flag a test batch and confirm the flag appears in its history.
