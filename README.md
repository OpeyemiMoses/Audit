# AUDIT — Intelligence & Security Layer for Binance Agent OS

> **Official Submission for the Binance Agent OS Mini Hackathon**  
> **Track A: Agent Creation** ($20,000 USDC Prize Pool)  
> **Themes:** Trading Workflows, Data Analysis, and Onchain Security

[![Binance Agent OS](https://img.shields.io/badge/Binance-Agent%20OS-F0B90B?style=flat-square&logo=binance&logoColor=black)](https://developers.binance.com)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP%20Native-blue?style=flat-square)](https://modelcontextprotocol.io)
[![Groq AI](https://img.shields.io/badge/AI%20Reasoning-Groq%20Llama%203.3%20%2F%20GPT--OSS-orange?style=flat-square)](https://groq.com)
[![BNB Chain](https://img.shields.io/badge/Chains-BNB%20%7C%20opBNB%20%7C%20EVM-yellow?style=flat-square)](https://bnbchain.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## 1. Project Overview & Goals

AUDIT is an autonomous intelligence, security verification, and risk-evaluation layer purpose-built for the **Binance Agent OS** and the **Model Context Protocol (MCP)**.

### The Problem
Autonomous AI agents executing trades, yield strategies, and on-chain interactions face critical operational vulnerabilities:
1. **Malicious Tokens & Honeypots**: Agents can buy un-sellable tokens with 100% sell taxes or blacklist functions.
2. **Unverified Smart Contracts & Drainers**: Interacting with proxy drainer contracts can deplete sub-account funds.
3. **Liquidity & Slippage Traps**: Automated swaps on low-depth DEX pools suffer severe impermanent loss and sandwich attacks.
4. **Absence of Enforceable Pre-Flight Guards**: Existing agent frameworks lack a verifiable risk check before trade execution.

### The Solution
AUDIT provides AI agents with **9 specialized Model Context Protocol (MCP) tools** and REST endpoints. Before an agent executes any action on Binance or BNB Chain, it calls AUDIT to verify security telemetry, query live market depth, and receive a deterministic **`ALLOW`**, **`WARN`**, or **`BLOCK`** verdict synthesized by **Groq AI (120B / Llama 3.3)** in under 800ms.

---

## 2. System Architecture

```
+----------------------------------------------------------------------------------------+
|                        Binance Agent OS / AI Agent Client                              |
|                    (Claude Desktop / Cursor / Grok / AutoGen Agent)                    |
+-------------------------------------------+--------------------------------------------+
                                            | Model Context Protocol (MCP) / REST
                                            v
+----------------------------------------------------------------------------------------+
|                          AUDIT Intelligence & Security Engine                          |
|                                [ mcp-server.ts ]                                       |
|                                                                                        |
|   +---------------------+   +------------------------+   +-------------------------+   |
|   | Token & Contract    |   | Transaction Simulator  |   | AI Decision Engine      |   |
|   | Risk Scoring        |   | & Drainer Detector     |   | (ALLOW / WARN / BLOCK)  |   |
|   +----------+----------+   +-----------+------------+   +------------+------------+   |
+--------------+--------------------------+-----------------------------+----------------+
               |                          |                             |
               v                          v                             v
+--------------------------+ +---------------------------+ +-----------------------------+
|    BNB Chain & EVM       | |     Binance Market Data   | |       Groq AI Reasoning     |
|  - BscScan / opBNB RPC   | |  - 24h Ticker & Volume    | |  - openai/gpt-oss-120b      |
|  - GoPlus Security API   | |  - Order Book Imbalance   | |  - llama-3.3-70b-versatile  |
|  - DeFiLlama Protocol TVL| |  - Perp Funding Rates     | |  - Sub-second risk synthesis|
+--------------------------+ +---------------------------+ +-----------------------------+
```

---

## 3. The 9 Native MCP Tools

AUDIT natively implements the **Model Context Protocol (MCP)** specification. Any Agent OS client discovers these tools automatically:

| # | MCP Tool Name | Description | Key Telemetry Provided |
| :-: | :--- | :--- | :--- |
| **1** | `audit_token` | Token legitimacy & honeypot risk | Honeypot detection, buy/sell taxes, blacklist functions, mintability, top-10 concentration. |
| **2** | `audit_contract` | Smart contract security audit | Verified source code, proxy implementations, privileged access controls, AI plain-English summary. |
| **3** | `audit_transaction` | Pre-execution tx simulation | Calldata decoding, state override checks, phishing drainer signature detection. |
| **4** | `audit_wallet` | Wallet risk & counterparty profiling | Asset balances, transaction velocity, liquidation proximity, bot probability score. |
| **5** | `audit_protocol` | DeFi protocol health tracker | Protocol TVL trends, security audit history, fork detection, exploit records. |
| **6** | `audit_defi_yield` | Yield & Liquidation risk comparator | Compares BNB Chain (PancakeSwap/Venus) and Binance Earn APYs against impermanent loss risk. |
| **7** | `evaluate_agent_decision` | **Autonomous Agent Decision Engine** | Synthesizes multi-source telemetry into an explicit **`ALLOW`**, **`WARN`**, or **`BLOCK`** verdict. |
| **8** | `get_binance_market_alpha` | Binance live market & perp intelligence | Real-time 24h ticker, order book depth imbalance, bid/ask spread, and perpetual funding rates. |
| **9** | `audit_unified` | Smart single-query router | Auto-detects token, contract, wallet, tx hash, or protocol and routes automatically. |

---

## 4. Quick Start & Replication Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Groq API Key**: (Available at [console.groq.com](https://console.groq.com))

---

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/OpeyemiMoses/Audit.git
cd Audit

# Install dependencies
npm install
```

---

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
PORT=4000
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
BNB_RPC_URL=https://bsc-dataseed.binance.org
BSCSCAN_API_KEY=your_bscscan_or_etherscan_api_key_here
ETHERSCAN_API_KEY=your_bscscan_or_etherscan_api_key_here
GOPLUS_API_KEY=your_goplus_api_key_here
COINGECKO_API_KEY=your_coingecko_api_key_here
```

---

### 4. Running AUDIT

#### Mode A: Run the Web Dashboard & REST API
```bash
# Development mode with hot-reload
npm run dev

# Or build and start production server
npm run build
npm start
```
Open **`http://localhost:4000`** in your browser to access the live interactive terminal.

#### Mode B: Start the Binance Agent OS MCP Server
```bash
npm run mcp
```
The server runs over `stdio` using the standard Model Context Protocol.

---

## 5. Connecting to Claude Desktop / Cursor

To allow Claude or Cursor agents to use AUDIT tools directly, add this to your `claude_desktop_config.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "binance-audit": {
      "command": "node",
      "args": ["<ABSOLUTE_PATH_TO_PROJECT>/dist/mcp-server.js"],
      "env": {
        "GROQ_API_KEY": "your_groq_api_key",
        "BNB_RPC_URL": "https://bsc-dataseed.binance.org"
      }
    }
  }
}
```

### Example Agent Interaction
> **User to Agent:** *"Analyze token `0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82` on BNB Chain and tell me if it is safe to execute a $5,000 swap on PancakeSwap."*
>
> **Agent:** *Calls `audit_token` and `evaluate_agent_decision` via AUDIT MCP Server -> Ingests security findings and liquidity depth -> Returns structured verdict:* **`ALLOW (Confidence: 88%)`** *with max slippage recommendations.*

---

## 6. Sample REST API Query

### Evaluate Agent Trade Intent (`POST /decision/evaluate`)
```bash
curl -X POST http://localhost:4000/decision/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Autonomous trading agent preparing $5,000 buy of XYZ token on PancakeSwap BNB Chain. Liquidity is $25,000, 2% sell tax detected.",
    "findings": ["Sell tax is 2%", "Liquidity is $25k", "No mint function detected"],
    "risk_score": 35,
    "chain": "bsc",
    "question": "Is this safe to execute?"
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
    "key_risks": [
      "Slippage risk on low pool liquidity"
    ],
    "key_strengths": [
      "No malicious bytecode found"
    ],
    "suggested_next_steps": [
      "Enforce max slippage limit",
      "Verify liquidity before executing"
    ],
    "ai_model": "openai/gpt-oss-120b"
  }
}
```

---

## 7. Supported Blockchains

- **BNB Smart Chain (BSC)** (`chainId: 56`) — Primary Default
- **opBNB Mainnet** (`chainId: 204`)
- **BNB Smart Chain Testnet** (`chainId: 97`)
- **Ethereum Mainnet** (`chainId: 1`)
- **Base** (`chainId: 8453`)
- **Arbitrum One** (`chainId: 42161`)
- **Polygon PoS** (`chainId: 137`)

---

## 8. Project Structure

```
audit/
├── public/                     # Web Dashboard & Interactive Terminal
│   ├── index.html              # Clean UI
│   ├── landing.css             # Stylesheet
│   ├── landing.js              # Client-side interactivity
│   └── hero-server.jpg         # Infrastructure photography
├── src/
│   ├── adapters/               # Data & AI Adapters
│   │   ├── binance.ts          # Binance 24h ticker & funding rates
│   │   ├── bscscan.ts          # BscScan / Etherscan V2
│   │   ├── goplus.ts           # GoPlus honeypot & risk scanning
│   │   ├── defillama.ts        # DeFi TVL & yield comparisons
│   │   ├── coingecko.ts        # Market caps & price feeds
│   │   └── groq.ts             # Groq LLM reasoning engine
│   ├── modules/                # Core Intelligence Modules
│   │   ├── token/              # Token risk auditor
│   │   ├── contract/           # Smart contract inspector
│   │   ├── transaction/        # Pre-trade simulator
│   │   ├── wallet/             # Wallet counterparty profiler
│   │   ├── protocol/           # DeFi protocol health
│   │   ├── defi/               # Yield & liquidation risk
│   │   ├── decision/           # AI Decision Engine (ALLOW / BLOCK)
│   │   └── unified/            # Auto-detect routing engine
│   ├── types/                  # TypeScript interfaces & chain definitions
│   ├── mcp-server.ts           # Binance Agent OS MCP Server (stdio)
│   └── server.ts               # Express REST API server
├── .env.example                # Environment template
├── CONTRIBUTING.md             # Contribution guidelines
├── CODE_OF_CONDUCT.md          # Contributor code of conduct
├── SECURITY.md                 # Security policy & disclosure
├── LICENSE                     # MIT License
└── README.md                   # Project documentation
```

---

## 9. Contributing & Governance

Contributions are welcome from the Binance and AI developer communities:
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

---

## 10. License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.
