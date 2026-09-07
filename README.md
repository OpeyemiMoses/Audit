# AUDIT — Intelligence & Security Layer for Binance Agent OS

> **Official Submission for the Binance Agent OS Mini Hackathon**  
> **Track A: Agent Creation** ($20,000 USDC Prize Pool)  
> **Primary Themes:** Trading Workflows, Data Analysis, and Onchain Security

[![Binance Agent OS](https://img.shields.io/badge/Binance-Agent%20OS-F0B90B?style=for-the-badge&logo=binance&logoColor=black)](https://developers.binance.com)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP%20Native-blue?style=for-the-badge)](https://modelcontextprotocol.io)
[![Groq AI](https://img.shields.io/badge/AI%20Reasoning-Groq%20Llama%203.3%20%2F%20GPT--OSS-orange?style=for-the-badge)](https://groq.com)
[![BNB Chain](https://img.shields.io/badge/Chains-BNB%20%7C%20opBNB%20%7C%20EVM-yellow?style=for-the-badge)](https://bnbchain.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

---

## ⚡ Executive Summary

**AUDIT** is an autonomous intelligence, security, and risk-evaluation infrastructure layer purpose-built for the **Binance Agent OS** ecosystem.

When autonomous AI trading or DeFi agents operate on Binance or BNB Chain, they cannot rely on raw LLM heuristics alone to evaluate security. A single malicious honeypot, drainer contract, or illiquid DEX pool can wipe out an agent's isolated sub-account. 

AUDIT bridges this gap by exposing **9 specialized Model Context Protocol (MCP) tools** and REST endpoints. Client AI agents (running in Claude Desktop, Cursor, Grok, LangGraph, or AutoGen) query AUDIT to verify token safety, audit smart contracts, simulate pre-trade transactions, monitor Binance Spot/Futures market alpha, and receive deterministic **`ALLOW`**, **`WARN`**, or **`BLOCK`** trade decisions powered by **Groq AI**.

---

## 🛠️ Architecture & Agent OS Pipeline

```
                     ┌────────────────────────────────────────────────────────┐
                     │         Binance Agent OS / AI Agent Client             │
                     │       (Claude / Cursor / Grok / AutoGen Agent)         │
                     └──────────────────────────┬─────────────────────────────┘
                                                │ MCP Tool Call / HTTP REST
                                                ▼
                     ┌────────────────────────────────────────────────────────┐
                     │          AUDIT Intelligence & Security Engine          │
                     │          [ Model Context Protocol (MCP) Server ]       │
                     └──────┬──────────────┬──────────────┬────────────┬──────┘
                            │              │              │            │
            ┌───────────────┴────┐  ┌──────┴──────┐  ┌────┴────┐ ┌─────┴──────────────┐
            ▼                    ▼  ▼             ▼  ▼         ▼ ▼                    ▼
     ┌─────────────┐     ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐ ┌─────────┐
     │  BNB Chain  │     │   Binance   │   │   GoPlus    │   │ DeFiLlama /     │ │ Groq AI │
     │  & BscScan  │     │ Market Data │   │  Security   │   │ Binance Earn    │ │ Llama   │
     │  (On-chain) │     │ (Spot/Perp) │   │ (Honeypots) │   │ (Yield & TVL)   │ │ 3.3/GPT │
     └─────────────┘     └─────────────┘   └─────────────┘   └─────────────────┘ └─────────┘
```

---

## 🧩 The 9 Native MCP Tools

| MCP Tool Name | Description | Key Telemetry Provided |
| :--- | :--- | :--- |
| `audit_token` | Token legitimacy & honeypot risk | Buy/sell taxes, honeypot detection, blacklist functions, top-10 holder concentration. |
| `audit_contract` | Smart contract bytecode & proxy audit | Verified source, proxy implementation, privileged functions, and AI security summary. |
| `audit_transaction` | Pre-execution transaction simulator | Decodes calldata, assesses asset flows, and detects phishing drainer signatures. |
| `audit_wallet` | Wallet risk & counterparty profiling | Asset balances, transaction velocity, liquidation proximity, and bot probability. |
| `audit_protocol` | DeFi protocol health tracker | Protocol TVL trends, security audit history, fork detection, and exploit records. |
| `audit_defi_yield` | Yield & Liquidation risk comparator | Compares BNB Chain (PancakeSwap/Venus) and Binance Earn APYs against impermanent loss risk. |
| `evaluate_agent_decision` | **Autonomous Agent Decision Engine** | Synthesizes multi-source telemetry into an explicit **`ALLOW`**, **`WARN`**, or **`BLOCK`** verdict. |
| `get_binance_market_alpha` | Binance live market & perp intelligence | 24h ticker, order book depth imbalance, bid/ask spread, and perpetual funding rate sentiment. |
| `audit_unified` | Smart single-query router | Auto-detects token, contract, wallet, tx hash, or protocol and routes automatically. |

---

## 🚀 Quick Start & Step-by-Step Replication Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Groq API Key**: (Get a free key at [console.groq.com](https://console.groq.com))

---

### 2. Installation
```bash
# Clone repository
git clone https://github.com/<your-username>/audit.git
cd audit

# Install dependencies (including @modelcontextprotocol/sdk)
npm install
```

---

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
PORT=4000
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
BNB_RPC_URL=https://bsc-dataseed.binance.org
ETHERSCAN_API_KEY=your_etherscan_or_bscscan_key
```

---

### 4. Build and Run AUDIT

#### Mode A: Run the Web Dashboard & REST API
```bash
npm run dev
```
Open **`http://localhost:4000`** in your browser to interact with the live Binance-themed dashboard and test token audits, contract security, market alpha, and agent decision evaluations.

#### Mode B: Connect to the Binance Agent OS MCP Server
Start the MCP server over stdio:
```bash
npm run mcp
```

---

### 5. Connecting AUDIT to Claude Desktop / Cursor

Add the following configuration to your `claude_desktop_config.json` (or Cursor MCP settings):

```json
{
  "mcpServers": {
    "binance-audit": {
      "command": "node",
      "args": ["<PATH_TO_PROJECT>/dist/mcp-server.js"],
      "env": {
        "GROQ_API_KEY": "your_groq_api_key",
        "BNB_RPC_URL": "https://bsc-dataseed.binance.org"
      }
    }
  }
}
```

Now in Claude or Cursor, simply prompt your agent:
> *"Audit token `0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82` on BNB Chain and tell me if it's safe to buy $1,000 worth."*

The agent will automatically invoke `audit_token` and `evaluate_agent_decision` to verify safety before execution.

---

## 📡 Sample REST API Query

### Evaluate Agent Trade Intent (`POST /decision/evaluate`)
```bash
curl -X POST http://localhost:4000/decision/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Autonomous trading agent preparing $5,000 buy of XYZ meme token on PancakeSwap BNB Chain. Liquidity is $25,000, 2% sell tax detected.",
    "findings": ["Sell tax is 2%", "Liquidity is $25k", "No mint function detected"],
    "risk_score": 35,
    "chain": "bsc"
  }'
```

#### Response Payload:
```json
{
  "status": "success",
  "module": "decision/evaluate",
  "chain": "bsc",
  "summary": "Decision Engine: ALLOW (confidence: 88%) — Balanced risk assessment based on provided telemetry.",
  "risk_score": 35,
  "risk_level": "low",
  "confidence": 0.88,
  "data": {
    "recommendation": "ALLOW",
    "confidence": 0.88,
    "key_risks": ["Slippage risk on low pool liquidity"],
    "key_strengths": ["No malicious bytecode found"],
    "suggested_next_steps": [
      "Enforce max slippage limit",
      "Verify liquidity before executing"
    ],
    "ai_model": "openai/gpt-oss-120b"
  }
}
```

---

## 🌐 Supported Blockchains

- **BNB Smart Chain (BSC)** (`chainId: 56`) — *Primary Default*
- **opBNB Mainnet** (`chainId: 204`)
- **BNB Smart Chain Testnet** (`chainId: 97`)
- **Ethereum Mainnet** (`chainId: 1`)
- **Base** (`chainId: 8453`)
- **Arbitrum One** (`chainId: 42161`)
- **Polygon PoS** (`chainId: 137`)

---

## 📹 Video Demo Walkthrough Guide (For Submission)

When recording your 2-minute submission video for X / YouTube:

1. **Introduction (15s)**: Introduce **AUDIT** as the intelligence & security layer for Binance Agent OS (Track A).
2. **Dashboard Overview (30s)**: Show the web dashboard on `http://localhost:4000` — run a live Token Audit on CAKE (`0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82`) on BNB Chain.
3. **Binance Market Alpha (25s)**: Click Binance Market Alpha tab to demonstrate real-time `BNBUSDT` order book depth and perpetual funding rates.
4. **Agent Decision Playground (30s)**: Submit a proposed trade to the Decision Engine and showcase how Groq AI synthesizes risks into an enforceable `ALLOW` / `BLOCK` verdict.
5. **MCP Integration (20s)**: Show the MCP Server configuration and tool discovery connecting to Agent OS agents.

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.
