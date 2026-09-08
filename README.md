<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/logo-full-white.png">
    <source media="(prefers-color-scheme: light)" srcset="assets/brand/logo-full-black.png">
    <img src="assets/brand/logo-full-black.png" alt="AUDIT - Intelligence & Security Layer for Binance Agent OS" width="400">
  </picture>
</p>

<h1 align="center">AUDIT &mdash; Intelligence &amp; Security Layer for Binance Agent OS</h1>

<p align="center">
  <strong>The pre-trade security guardrail every autonomous AI agent needs before pulling the trigger.</strong>
</p>

<p align="center">
  <a href="https://developers.binance.com"><img src="https://img.shields.io/badge/Binance-Agent%20OS%20Hackathon-F0B90B?style=flat-square&logo=binance&logoColor=black" alt="Binance Agent OS"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/Protocol-MCP%20Native-4A90D9?style=flat-square" alt="MCP Native"></a>
  <a href="https://groq.com"><img src="https://img.shields.io/badge/AI-Groq%20%7C%20GPT--OSS-FF4B00?style=flat-square" alt="Groq AI"></a>
  <a href="https://bnbchain.org"><img src="https://img.shields.io/badge/Chain-BNB%20%7C%20opBNB%20%7C%20EVM-F0B90B?style=flat-square" alt="BNB Chain"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22C55E?style=flat-square" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#1-what-is-audit">Overview</a> &nbsp;&middot;&nbsp;
  <a href="#2-how-it-works-with-binance-agent-os">Agent OS Integration</a> &nbsp;&middot;&nbsp;
  <a href="#3-the-9-mcp-tools">MCP Tools</a> &nbsp;&middot;&nbsp;
  <a href="#4-quick-start">Quick Start</a> &nbsp;&middot;&nbsp;
  <a href="#5-connect-to-claude--cursor--codex">Connect to Claude</a> &nbsp;&middot;&nbsp;
  <a href="#6-rest-api-reference">REST API</a> &nbsp;&middot;&nbsp;
  <a href="#7-architecture">Architecture</a>
</p>

---

> **Binance Agent OS Mini Hackathon &mdash; Track A Submission**
> *Build an AI agent using Agent OS &mdash; $20,000 USDC Prize Pool*

---

## Table of Contents

- [1. What Is AUDIT?](#1-what-is-audit)
- [2. How It Works with Binance Agent OS](#2-how-it-works-with-binance-agent-os)
- [3. The 9 MCP Tools](#3-the-9-mcp-tools)
- [4. Quick Start](#4-quick-start)
- [5. Connect to Claude / Cursor / Codex](#5-connect-to-claude--cursor--codex)
- [6. REST API Reference](#6-rest-api-reference)
- [7. Architecture](#7-architecture)
- [8. Supported Blockchains](#8-supported-blockchains)
- [9. Project Structure](#9-project-structure)
- [10. Environment Variables](#10-environment-variables)
- [11. Contributing](#11-contributing)
- [12. License](#12-license)

---

## 1. What Is AUDIT?

**AUDIT** is an autonomous security intelligence and risk evaluation layer purpose-built for **Binance Agent OS** and the **Model Context Protocol (MCP)**.

Binance Agent OS enables AI agents to trade, access market data, manage wallets, and execute payments. AUDIT is the **security intelligence layer that runs before any of that executes** &mdash; checking every token, contract, wallet, and transaction for risk, then issuing a plain-English verdict: **ALLOW, WARN, or BLOCK**.

### The Problem Autonomous Agents Face

When an AI agent operates on Binance or BNB Chain without a security layer, it is exposed to:

| Risk | Impact |
|------|--------|
| **Honeypot tokens** | Agent buys a token it can never sell &mdash; 100% loss |
| **Drainer contracts** | Proxy contract drains the agent's sub-account wallet |
| **Sandwich attacks** | Low-depth DEX pools allow front-running on agent swaps |
| **Malicious wallets** | Agent interacts with mixer-linked or flagged counterparties |
| **No pre-flight check** | Agent executes blindly with no verifiable risk gate |

### The Solution

AUDIT gives any AI agent &mdash; running on Claude, Cursor, Codex, or a self-built framework &mdash; **9 specialized MCP tools** that provide:

- Token honeypot & tax detection (GoPlus + on-chain)
- Smart contract source verification & exploit vector analysis
- Pre-trade transaction simulation & drainer detection
- Wallet risk profiling (mixer detection, bot score, reputation)
- Live Binance orderbook depth, spread & market regime
- DeFi protocol TVL, audit history & exploit records
- Yield & liquidation distance comparisons across BSC protocols
- **ALLOW / WARN / BLOCK** autonomous decision engine
- All responses in **clean readable text** &mdash; no JSON parsing needed by agents

---

## 2. How It Works with Binance Agent OS

AUDIT sits alongside Binance Agent OS as a **complementary MCP server**. The agent loads both simultaneously and uses them in sequence: AUDIT audits first, Agent OS trades only if AUDIT clears it.

```
AI AGENT (Claude / Codex / Cursor)
     |                         |
     v                         v
AUDIT MCP Server         Binance Agent OS MCP
(Security Layer)         (Trading & Markets)
     |
     | audit_token()
     | audit_contract()
     | audit_wallet()
     | evaluate_agent_decision()
     | get_binance_market_alpha()
     |
     v
VERDICT: ALLOW / WARN / BLOCK
     |
     v (if ALLOW)
Binance Agent OS --> place_order()
```

### The Typical Agent Workflow

**Scenario:** Agent intends to swap $5,000 of USDT into a BNB Chain token.

```
Step 1  Agent calls: audit_token("0xABC...", "bsc")
        Returns: "No honeypot. Verified source. $48M liquidity.
                  Top 10 holders: 34%. Mintable: YES.
                  [!] Watch supply inflation risk."

Step 2  Agent calls: get_binance_market_alpha("CAKEUSDT")
        Returns: "Price $2.14. Spread 0.001%. Buyers > Sellers.
                  24h Volume $134M. Market Regime: NEUTRAL."

Step 3  Agent calls: evaluate_agent_decision(context, findings, risk_score)
        Returns: "Risk Score: 18/100.
                  VERDICT: ALLOW
                  Reasoning: Token verified, liquid, non-honeypot.
                  Watch: mintable supply could inflate.
                  Recommended slippage cap: 1.5%"

Step 4  Agent calls Binance Agent OS MCP --> place_order("CAKEUSDT", 5000)
        Trade executes -- fully audited, fully informed.
```

Without AUDIT, the agent executes Step 4 with zero security knowledge.

---

## 3. The 9 MCP Tools

AUDIT exposes 9 MCP tools discoverable at `GET /mcp/tools`. Each tool returns **clean, readable text** &mdash; designed so AI agents can read and reason about the output directly.

| # | Tool | What It Checks | Returns |
|:-:|:-----|:--------------|:--------|
| **1** | `audit_token` | Honeypot detection, buy/sell taxes, blacklist, mintability, holder concentration, DEX liquidity | Full token risk report + verdict |
| **2** | `audit_contract` | Source verification, proxy detection, privileged functions, exploit vectors | Full contract security audit + AI summary |
| **3** | `audit_transaction` | Pre-execution simulation, drainer signatures, phishing risk, abnormal gas | Transaction simulation report + guardrails |
| **4** | `audit_wallet` | Balance, transaction velocity, mixer interaction, bot probability, whale score | Wallet risk profile |
| **5** | `audit_protocol` | Protocol TVL, TVL trend, audit history, known exploits, active chains | Protocol security assessment |
| **6** | `audit_defi_yield` | Yield pool APYs, impermanent loss risk, liquidation distance, collateral ratio | Yield risk comparison |
| **7** | `evaluate_agent_decision` | Multi-source risk synthesis | **ALLOW / WARN / BLOCK** verdict + reasoning |
| **8** | `get_binance_market_alpha` | Live Binance Spot price, 24h metrics, bid/ask spread, orderbook depth, top 5 bids/asks, market regime | Real-time market intelligence |
| **9** | `audit_unified` | Auto-detects input type (token, contract, wallet, tx, protocol) and routes automatically | Full security report for any input |

### Sample MCP Tool Output

When Claude calls `get_binance_market_alpha({ symbol: "BNBUSDT" })`, it receives:

```
AUDIT REPORT - BINANCE REAL-TIME ORDERBOOK TELEMETRY
==================================================

=== LIVE SPOT PRICE ===
- Symbol: BNBUSDT
- Current Price: $744.35
- 24h Change: -0.04%
- 24h High: $761.39
- 24h Low: $733.00
- 24h Volume USD: $134,916,696
- Market Regime: NEUTRAL

=== ORDERBOOK DEPTH & LIQUIDITY ===
- Bid/Ask Spread: 0.001%
- Total Bid Depth (Buyers): $89,438
- Total Ask Depth (Sellers): $73,785
- Orderbook Imbalance Signal: Balanced Orderbook Liquidity
- Bid/Ask Ratio: 1.21x

=== TOP 5 BID ORDERS (BUY PRESSURE) ===
  $744.34  -  3.0820 units
  $744.33  -  0.0150 units
  $744.32  -  0.0410 units
  $744.31  -  0.0220 units
  $744.30  -  6.7960 units

=== TOP 5 ASK ORDERS (SELL PRESSURE) ===
  $744.35  -  13.7550 units
  $744.36  -  10.5230 units
  $744.37  -  4.1830 units
  $744.38  -  8.2140 units
  $744.39  -  2.4990 units

--------------------------------------------------
Data Source: Binance Spot REST API
Powered by AUDIT Binance Agent OS
```

---

## 4. Quick Start

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Groq API Key** &mdash; [console.groq.com](https://console.groq.com) (free tier available)
- **BscScan API Key** &mdash; [bscscan.com/apis](https://bscscan.com/apis) (free)
- **GoPlus API Key** &mdash; [gopluslabs.io](https://gopluslabs.io) (free tier available)

### Installation

```bash
# Clone the repository
git clone https://github.com/OpeyemiMoses/Audit.git
cd Audit

# Install all dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your API keys (see Section 10)
```

### Running AUDIT

```bash
# Mode A: Web Dashboard + REST API (development with hot-reload)
npm run dev
# Open http://localhost:4000

# Mode A: Production
npm run build && npm start

# Mode B: MCP Server for Claude / Cursor / Codex (stdio)
npm run mcp
```

---

## 5. Connect to Claude / Cursor / Codex

> **No installation or API keys required by callers.**
> AUDIT is a deployed server &mdash; anyone can call your live endpoint directly.
> Self-hosting is only needed if you want to run your own private instance.

### Option A &mdash; Use the Live Deployed API (Recommended, Zero Setup)

If AUDIT is already deployed (e.g. on Railway or Render), callers just hit your endpoint.
No `.env`, no installation, no API keys needed on their side.

**For REST API calls (any HTTP client, agent, or tool):**
```bash
# Anyone can call this directly -- no setup needed
curl -X POST https://your-deployment-url.railway.app/token/analyze \
  -H "Content-Type: application/json" \
  -d '{ "address": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "chain": "bsc" }'
```

**For MCP inside Claude Desktop or Cursor (via mcp-remote bridge):**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "binance-agent-os": {
      "command": "npx",
      "args": ["-y", "@binance/agent-os-mcp"],
      "env": {
        "BINANCE_API_KEY": "your_binance_api_key",
        "BINANCE_SECRET_KEY": "your_binance_secret"
      }
    },
    "audit-security": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-deployment-url.railway.app/mcp"]
    }
  }
}
```

That's it. Claude now has all 9 AUDIT tools available alongside Binance Agent OS &mdash; **no API keys, no local install, no environment variables**.

The `mcp-remote` package (by Anthropic) bridges your deployed HTTP server to Claude's stdio MCP transport automatically.

---

### Option B &mdash; Self-Host Locally (For Developers Only)

Only needed if you want to run your own private instance of AUDIT.

```bash
git clone https://github.com/OpeyemiMoses/Audit.git
cd Audit
npm install
cp .env.example .env   # Add your own API keys
npm run build
npm run mcp            # Start MCP server over stdio
```

Then configure Claude Desktop with the local path:

```json
{
  "mcpServers": {
    "audit-security": {
      "command": "node",
      "args": ["/absolute/path/to/Audit/dist/mcp-server.js"],
      "env": {
        "GROQ_API_KEY": "your_groq_api_key",
        "BSCSCAN_API_KEY": "your_bscscan_api_key",
        "BNB_RPC_URL": "https://bsc-dataseed.binance.org"
      }
    }
  }
}
```

---

### What the Agent Sees

Once connected either way, Claude automatically discovers all 9 AUDIT tools. You can ask:

> *"Audit token 0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82 on BNB Chain, check the BNB market depth on Binance, then tell me if a $5,000 buy is safe to execute."*

Claude will call `audit_token` &rarr; `get_binance_market_alpha` &rarr; `evaluate_agent_decision` and return a unified plain-English security report.

### HTTP MCP Execute (for custom agents using HTTP transport)

```bash
# Discover all tools and their required parameters
curl https://your-deployment-url.railway.app/mcp/tools

# Execute any tool
curl -X POST https://your-deployment-url.railway.app/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_binance_market_alpha",
    "parameters": { "symbol": "BNBUSDT" }
  }'
```

---

## 6. REST API Reference

### Health Check
```
GET /health
```

### Token Audit
```
POST /token/analyze
{ "address": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "chain": "bsc" }
```

### Smart Contract Audit
```
POST /contract/analyze
{ "address": "0x10ED43C718714eb63d5aA57B78B54704E256024E", "chain": "bsc" }
```

### Wallet Risk Profile
```
POST /wallet/analyze
{ "address": "0x8894e0a0c962cb723c1976a4421c95949be2d4e3", "chain": "bsc" }
```

### Transaction Simulation
```
POST /transaction/analyze
{ "txHash": "0x5c504ed...", "chain": "ethereum" }
```

### Live Binance Market Depth
```
GET  /market/depth?symbol=BNBUSDT
POST /market/depth       { "symbol": "BNBUSDT" }
GET  /market/binance?symbol=BNBUSDT
```

### Agent Decision Engine
```bash
curl -X POST http://localhost:4000/decision/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Autonomous agent preparing $5,000 buy of CAKE on PancakeSwap",
    "findings": ["No honeypot", "Verified source code", "Liquidity $48M"],
    "risk_score": 18,
    "question": "Is this safe to execute?"
  }'
```

**Response:**
```json
{
  "status": "success",
  "module": "decision/evaluate",
  "data": {
    "recommendation": "ALLOW",
    "confidence": 0.88,
    "risk_score": 18,
    "risk_level": "low",
    "key_risks": ["Mintable supply could inflate"],
    "key_strengths": ["No malicious bytecode", "High liquidity", "Verified source"],
    "suggested_next_steps": [
      "Cap slippage at 1.5%",
      "Monitor supply changes post-trade"
    ]
  }
}
```

### Unified Auto-Detect
```
POST /analyze
{ "query": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "chain": "bsc" }
```

### Full Endpoint Map

| Method | Endpoint | Module |
|--------|----------|--------|
| POST | `/analyze` | Unified auto-detect |
| POST | `/token/analyze` | Token risk audit |
| POST | `/token/risk` | Token risk only |
| POST | `/token/holders` | Holder concentration |
| POST | `/contract/analyze` | Contract security |
| POST | `/contract/summarize` | Contract AI summary |
| POST | `/contract/security` | Contract security flags |
| POST | `/wallet/analyze` | Wallet risk profile |
| POST | `/wallet/score` | Wallet reputation score |
| POST | `/transaction/analyze` | Transaction simulation |
| POST | `/transaction/explain` | TX plain-English explanation |
| POST | `/protocol/analyze` | Protocol TVL & security |
| POST | `/defi/analyze` | DeFi yield & risk |
| POST | `/decision/evaluate` | ALLOW / WARN / BLOCK verdict |
| GET/POST | `/market/depth` | Live Binance orderbook |
| GET | `/market/binance` | Live Binance ticker |
| GET | `/mcp/tools` | MCP tool discovery with parameter schemas |
| POST | `/mcp/execute` | HTTP MCP tool execution |
| GET | `/health` | API health check |

---

## 7. Architecture

```
AUDIT ENGINE
|
+-- MCP Server (stdio)    src/mcp-server.ts
+-- REST API (HTTP)       src/server.ts
+-- Web Dashboard         public/
|
+-- MODULE LAYER
|   +-- token/            Token honeypot & risk
|   +-- contract/         Smart contract inspector
|   +-- wallet/           Wallet counterparty profiler
|   +-- transaction/      Pre-trade simulator
|   +-- protocol/         DeFi protocol health
|   +-- defi/             Yield & liquidation risk
|   +-- decision/         AI Decision Engine (ALLOW/WARN/BLOCK)
|   +-- unified/          Auto-detect routing engine
|
+-- ADAPTERS
|   +-- binance.ts        Binance Spot REST (ticker, orderbook, funding)
|   +-- bscscan.ts        BscScan / Etherscan V2
|   +-- goplus.ts         GoPlus honeypot & security scanning
|   +-- defillama.ts      DeFiLlama TVL & yield pools
|   +-- coingecko.ts      CoinGecko price & market cap
|   +-- groq.ts           Groq LLM reasoning engine
|
+-- LIB
    +-- text-formatter.ts JSON to plain-English for AI agents
    +-- cache.ts          In-memory response caching
    +-- logger.ts         Structured logging
    +-- errors.ts         Typed error classes
```

### Data Flow

1. **Agent** calls AUDIT via MCP (stdio) or REST API (HTTP)
2. **Module Layer** orchestrates adapters in parallel
3. **Adapters** fetch live on-chain data from GoPlus, BscScan, DefiLlama, Binance
4. **AI Reasoning** (Groq LLM) synthesizes findings into plain-English intelligence
5. **Text Formatter** converts structured data into agent-readable text
6. **ALLOW / WARN / BLOCK** verdict is returned to the agent

---

## 8. Supported Blockchains

| Chain | Chain ID | Primary Use |
|-------|----------|-------------|
| **BNB Smart Chain (BSC)** | 56 | Primary &mdash; default for all modules |
| **opBNB Mainnet** | 204 | BNB Layer 2 scaling |
| **BSC Testnet** | 97 | Development & testing |
| **Ethereum Mainnet** | 1 | Contract & transaction analysis |
| **Base** | 8453 | Coinbase L2 |
| **Arbitrum One** | 42161 | Arbitrum L2 |
| **Polygon PoS** | 137 | Polygon |

---

## 9. Project Structure

```
audit/
+-- public/                      Web Dashboard & Interactive Terminal
|   +-- index.html               Main application shell
|   +-- landing.css              Full design system & animations
|   +-- landing.js               Client-side logic & renderers
+-- src/
|   +-- adapters/                External Data Adapters
|   |   +-- binance.ts           Binance Spot REST (ticker, orderbook, funding)
|   |   +-- bscscan.ts           BscScan / Etherscan V2 API
|   |   +-- goplus.ts            GoPlus Security (honeypot, token risk)
|   |   +-- defillama.ts         DeFiLlama (TVL, yield pools)
|   |   +-- coingecko.ts         CoinGecko (price, market cap)
|   |   +-- groq.ts              Groq LLM reasoning engine
|   +-- lib/
|   |   +-- cache.ts             In-memory response caching
|   |   +-- errors.ts            Typed error classes
|   |   +-- logger.ts            Structured logging
|   |   +-- text-formatter.ts    JSON to readable text for agents
|   +-- modules/                 Core Intelligence Modules
|   |   +-- token/analyze.ts     Token honeypot & risk auditor
|   |   +-- contract/analyze.ts  Smart contract inspector
|   |   +-- transaction/         Pre-trade simulator
|   |   +-- wallet/analyze.ts    Wallet counterparty profiler
|   |   +-- protocol/analyze.ts  DeFi protocol health
|   |   +-- defi/analyze.ts      Yield & liquidation risk
|   |   +-- decision/evaluate.ts AI Decision Engine (ALLOW/WARN/BLOCK)
|   |   +-- unified/analyze.ts   Auto-detect routing engine
|   +-- types/
|   |   +-- chains.ts            Chain definitions & constants
|   +-- mcp-server.ts            Binance Agent OS MCP Server (stdio)
|   +-- server.ts                Express REST API + /mcp/execute
+-- assets/
|   +-- brand/                   Logo, wordmark, brand assets
+-- .env.example                 Environment variable template
+-- tsconfig.json                TypeScript configuration
+-- package.json                 Dependencies & npm scripts
+-- CONTRIBUTING.md              Contribution guidelines
+-- SECURITY.md                  Security policy & disclosure
+-- LICENSE                      MIT License
+-- README.md                    This document
```

---

## 10. Environment Variables

Copy `.env.example` to `.env`:

```env
# Server
PORT=4000

# AI Reasoning Engine (Required)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# BNB Chain RPC (Required)
BNB_RPC_URL=https://bsc-dataseed.binance.org

# Block Explorers (Required for contract & transaction analysis)
BSCSCAN_API_KEY=your_bscscan_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Security Data (Required for token honeypot detection)
GOPLUS_API_KEY=your_goplus_api_key_here

# Market Data (Optional - enhances market intelligence)
COINGECKO_API_KEY=your_coingecko_api_key_here
```

| Variable | Required | Source |
|----------|----------|--------|
| `GROQ_API_KEY` | Yes | [console.groq.com](https://console.groq.com) |
| `BNB_RPC_URL` | Yes | [nodereal.io](https://nodereal.io) or [ankr.com](https://ankr.com) |
| `BSCSCAN_API_KEY` | Yes | [bscscan.com/apis](https://bscscan.com/apis) |
| `GOPLUS_API_KEY` | Yes | [gopluslabs.io](https://gopluslabs.io) |
| `ETHERSCAN_API_KEY` | Optional | [etherscan.io/apis](https://etherscan.io/apis) |
| `COINGECKO_API_KEY` | Optional | [coingecko.com/api](https://www.coingecko.com/en/api) |

---

## 11. Contributing

Contributions, bug reports, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting.  
For security vulnerabilities, see [SECURITY.md](SECURITY.md).

---

## 12. License

This project is licensed under the **MIT License** &mdash; see [LICENSE](LICENSE) for full details.

---

<p align="center">
  <strong>Built for the Binance Agent OS Mini Hackathon &mdash; Track A</strong><br>
  <em>The security intelligence layer autonomous agents need before they trade.</em>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/logo-full-white.png">
    <source media="(prefers-color-scheme: light)" srcset="assets/brand/logo-full-black.png">
    <img src="assets/brand/logo-full-black.png" alt="AUDIT" width="180">
  </picture>
</p>
