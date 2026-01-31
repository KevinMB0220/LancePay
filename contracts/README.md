# Milestone Escrow Smart Contract

Soroban-based escrow contract for milestone-based payments on Stellar.

## Features

- **Trustless Escrow**: Funds locked on-chain until milestone completion
- **Client Protection**: Only release funds when satisfied
- **Freelancer Security**: Guaranteed payment once approved
- **Arbiter Support**: Platform can intervene if needed

## Functions

- `init()` - Initialize contract with client, freelancer, arbiter addresses
- `fund_milestone()` - Client deposits USDC into escrow
- `release_funds()` - Client/arbiter releases funds to freelancer
- `status()` - Check milestone status (Pending/Funded/Completed)

## Build

```bash
cd contracts
soroban contract build
```

## Deploy to Testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/milestone_escrow.wasm \
  --network testnet
```

## Related Issue

Closes #89
