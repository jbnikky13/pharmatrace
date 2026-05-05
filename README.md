# 💊 PharmaTrace

> Blockchain-powered drug authentication for Nigeria — built on Solana.

![Solana](https://img.shields.io/badge/Solana-Devnet-14F195?style=flat&logo=solana)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat&logo=react)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)

## 🚨 The Problem

Nigeria loses an estimated 100,000+ lives annually to counterfeit and substandard medicines. The WHO estimates over 40% of drugs in circulation across sub-Saharan Africa may be falsified. Existing verification systems are centralized, manipulable, and inaccessible to rural pharmacists and everyday consumers.

## ✅ The Solution

PharmaTrace puts drug authentication on the Solana blockchain — immutable, public, and verifiable by anyone with a phone.

- Manufacturers register drug batches on-chain with NAFDAC batch IDs
- Pharmacists and consumers verify authenticity instantly by entering a batch ID
- Counterfeit drugs return a clear warning with NAFDAC reporting hotline

No centralized database. No manipulation. No trust required.

## 🌐 Live Demo

🔗 [pharmatrace-xi.vercel.app](https://pharmatrace-xi.vercel.app)

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana (Devnet) |
| Smart Contracts | Anchor Framework |
| Frontend | React + TypeScript |
| Wallet | Phantom via Solana Wallet Adapter |
| Web3 | @solana/web3.js |
| Deployment | Vercel |
| Dev Environment | GitHub Codespaces |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Phantom Wallet (set to Devnet)
- Solana CLI + Anchor CLI

### Installation

```bash
git clone https://github.com/jbnikky13/pharmatrace.git
cd pharmatrace/pharmatrace/app
npm install
npm run dev
