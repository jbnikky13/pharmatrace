# 💊 PharmaTrace

> Onchain pharmaceutical batch provenance for Nigeria, migrating from the original Solana prototype to Circle's Arc EVM network.

## Phase 1 — Arc registry

PharmaTrace now has an Arc/EVM registry contract and an EIP-1193 frontend. The old browser-only registry and Solana self-transfer demo are no longer used by the application.

### Phase 1 capabilities

- Solidity `PharmaTraceRegistry`
- Arc mainnet configuration
- Chain ID `5042`
- Direct onchain batch registration
- Direct onchain batch verification
- Batch status updates and flagging
- Arc Explorer transaction links
- Wallet connection through EIP-1193
- No in-memory verification registry
- No fake self-transfer as a registration transaction

### Arc network

| Setting | Value |
|---|---|
| Network | Arc |
| Chain ID | `5042` |
| RPC | `https://rpc.mainnet.arc.io` |
| Gas currency | USDC |
| Explorer | `https://explorer.arc.io` |

Circle's documentation lists Arc's USDC contract as `0x3600000000000000000000000000000000000000`. Phase 1 does not transfer USDC; settlement is Phase 2.

### Deploy the registry

From `pharmatrace/`:

```bash
forge build
forge create contracts/PharmaTraceRegistry.sol:PharmaTraceRegistry \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key "$ARC_PRIVATE_KEY"
```

For a rehearsal deployment, use Arc Testnet:

```bash
forge create contracts/PharmaTraceRegistry.sol:PharmaTraceRegistry \
  --rpc-url https://rpc.testnet.arc.io \
  --private-key "$ARC_PRIVATE_KEY"
```

Never commit a private key.

### Configure the frontend

Create `pharmatrace/app/.env.local`:

```env
VITE_PHARMATRACE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT
```

Then:

```bash
cd pharmatrace/app
npm install
npm run build
npm run dev
```

For Vercel, add `VITE_PHARMATRACE_CONTRACT_ADDRESS` as a project environment variable and redeploy.

### Architecture

```
Authorized manufacturer/operator
          |
          | registerBatch()
          v
   PharmaTraceRegistry
          |
          +---- Arc event logs
          |
          +---- verifyBatch()
          |
          v
   Pharmacist / consumer
```

### Security boundary

Phase 1 uses a single contract owner for registration and status changes. This is intentionally minimal for the first deployment and is not the final multi-party authorization model.

Phase 2 will add USDC settlement, participant roles, stronger authorization and production monitoring.

## License

MIT
