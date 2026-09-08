// src/mcp-server.ts
// Binance Agent OS — Model Context Protocol (MCP) Server for AUDIT
// All tool responses are formatted as clean, readable text for AI agents

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { analyzeToken } from './modules/token/analyze.js';
import { analyzeContract } from './modules/contract/analyze.js';
import { analyzeTransaction } from './modules/transaction/analyze.js';
import { analyzeWallet } from './modules/wallet/analyze.js';
import { analyzeProtocol } from './modules/protocol/analyze.js';
import { analyzeDeFi } from './modules/defi/analyze.js';
import { evaluateDecision } from './modules/decision/evaluate.js';
import { analyzeUnified } from './modules/unified/analyze.js';
import { binanceAdapter } from './adapters/binance.js';
import logger from './lib/logger.js';



// Load text formatter
import {
  formatTokenText,
  formatContractText,
  formatWalletText,
  formatTransactionText,
  formatDecisionText,
  formatMarketDepthText,
  formatProtocolText,
  formatDeFiText,
  formatUnifiedText,
} from './lib/text-formatter.js';

// Create MCP Server instance
const server = new McpServer({
  name: 'audit-binance-agent-os',
  version: '1.0.0',
});

// ─── Tool 1: Audit Token ─────────────────────────────────────────────────────
server.tool(
  'audit_token',
  `Audit a cryptocurrency or meme token for security risks, honeypots, buy/sell taxes, blacklist functions, and market depth on BNB Chain and other EVM networks.

REQUIRED PARAMETERS:
  - address: The token contract address (starts with 0x, 42 characters)
  - chain: The blockchain network. Options: bsc (BNB Chain), ethereum, base, arbitrum, polygon, opbnb. Default: bsc

EXAMPLE USAGE:
  { "address": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "chain": "bsc" }

RETURNS: Full token security audit including honeypot detection, liquidity analysis, holder concentration, exploit vector assessment, AI security summary, and a final ALLOW / WARN / BLOCK verdict.`,
  {
    address: z.string().describe('The token contract address (0x..., 42 characters)'),
    chain: z.string().default('bsc').describe('Blockchain network: bsc, ethereum, base, arbitrum, polygon, opbnb. Default: bsc'),
  },
  async ({ address, chain }) => {
    try {
      const res = await analyzeToken({ address, chain });
      return { content: [{ type: 'text', text: formatTokenText(res) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error auditing token: ${err.message}` }], isError: true };
    }
  }
);

// ─── Tool 2: Audit Smart Contract ────────────────────────────────────────────
server.tool(
  'audit_contract',
  `Inspect a smart contract for verified source code, proxy implementations, vulnerability patterns, privileged admin functions, reentrancy risks, and AI-generated security analysis.

REQUIRED PARAMETERS:
  - address: The smart contract address (starts with 0x, 42 characters)
  - chain: The blockchain network. Options: bsc, ethereum, base, arbitrum, polygon. Default: bsc

EXAMPLE USAGE:
  { "address": "0x10ED43C718714eb63d5aA57B78B54704E256024E", "chain": "bsc" }

RETURNS: Full smart contract audit including verification status, proxy analysis, privileged functions, exploit vectors (oracle manipulation, admin key hijack, reentrancy, flash loan exposure), AI security summary, and verdict.`,
  {
    address: z.string().describe('The smart contract address (0x..., 42 characters)'),
    chain: z.string().default('bsc').describe('Blockchain network: bsc, ethereum, base, arbitrum, polygon. Default: bsc'),
  },
  async ({ address, chain }) => {
    try {
      const res = await analyzeContract({ address, chain });
      return { content: [{ type: 'text', text: formatContractText(res) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error auditing contract: ${err.message}` }], isError: true };
    }
  }
);

// ─── Tool 3: Audit Transaction ───────────────────────────────────────────────
server.tool(
  'audit_transaction',
  `Simulate or explain a blockchain transaction before execution. Identifies phishing patterns, drainer contracts, abnormal gas usage, and unexpected token transfers.

REQUIRED PARAMETERS:
  - txHash: The transaction hash to inspect (starts with 0x, 66 characters)
  - chain: The blockchain network. Options: bsc, ethereum, base, arbitrum. Default: bsc

EXAMPLE USAGE:
  { "txHash": "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060", "chain": "ethereum" }

RETURNS: Transaction simulation results including execution outcome, token transfers, drainer pattern detection, phishing risk, slippage, gas analysis, AI explanation, and pre-trade guardrails.`,
  {
    txHash: z.string().describe('Transaction hash to inspect (0x..., 66 characters)'),
    chain: z.string().default('bsc').describe('Blockchain network: bsc, ethereum, base, arbitrum. Default: bsc'),
  },
  async ({ txHash, chain }) => {
    try {
      const res = await analyzeTransaction({ txHash, chain });
      return { content: [{ type: 'text', text: formatTransactionText(res) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error analyzing transaction: ${err.message}` }], isError: true };
    }
  }
);

// ─── Tool 4: Audit Wallet ────────────────────────────────────────────────────
server.tool(
  'audit_wallet',
  `Analyze a wallet address for counterparty risk, protocol interactions, asset balances, suspicious mixer activity, bot probability, and reputation score.

REQUIRED PARAMETERS:
  - address: The EVM wallet address to audit (starts with 0x, 42 characters)
  - chain: The blockchain network. Options: bsc, ethereum, base, arbitrum, polygon. Default: bsc

EXAMPLE USAGE:
  { "address": "0x8894e0a0c962cb723c1976a4421c95949be2d4e3", "chain": "bsc" }

RETURNS: Wallet risk profile including balance, transaction history, protocols used, mixer interaction detection, bot probability, whale score, reputation score, malicious flags, and security recommendations.`,
  {
    address: z.string().describe('The EVM wallet address to audit (0x..., 42 characters)'),
    chain: z.string().default('bsc').describe('Blockchain network: bsc, ethereum, base, arbitrum, polygon. Default: bsc'),
  },
  async ({ address, chain }) => {
    try {
      const res = await analyzeWallet({ address, chain });
      return { content: [{ type: 'text', text: formatWalletText(res) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error auditing wallet: ${err.message}` }], isError: true };
    }
  }
);

// ─── Tool 5: Audit Protocol ──────────────────────────────────────────────────
server.tool(
  'audit_protocol',
  `Retrieve total value locked (TVL), security audit records, historical exploits, and multi-chain status for DeFi protocols.

REQUIRED PARAMETERS:
  - query: The protocol slug or name (e.g. pancakeswap, venus, aave, uniswap, compound)
  - chain: The blockchain network. Options: bsc, ethereum, etc. Default: bsc

EXAMPLE USAGE:
  { "query": "pancakeswap", "chain": "bsc" }

RETURNS: Protocol TVL, audit history, exploit records, active chains, category, and security assessment.`,
  {
    query: z.string().describe('Protocol slug or name (e.g. pancakeswap, venus, aave, uniswap)'),
    chain: z.string().default('bsc').describe('Blockchain network. Default: bsc'),
  },
  async ({ query, chain }) => {
    try {
      const res = await analyzeProtocol({ query, chain });
      return { content: [{ type: 'text', text: formatProtocolText(res) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error analyzing protocol: ${err.message}` }], isError: true };
    }
  }
);

// ─── Tool 6: Audit DeFi Yield ────────────────────────────────────────────────
server.tool(
  'audit_defi_yield',
  `Compare DeFi yield opportunities and assess impermanent loss risk, liquidation distances, and collateral ratios across BNB Chain and EVM protocols.

OPTIONAL PARAMETERS (provide at least one):
  - address: Token or pool contract address
  - token: Token symbol to find yield for (e.g. BNB, USDT, ETH, CAKE)
  - chain: Blockchain network. Default: bsc

EXAMPLE USAGE:
  { "token": "BNB", "chain": "bsc" }
  { "address": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "chain": "bsc" }

RETURNS: Available yield pools with APY and TVL, risk assessment, impermanent loss exposure, liquidation distance, and AI summary.`,
  {
    address: z.string().optional().describe('Token or pool contract address (optional)'),
    token: z.string().optional().describe('Token symbol to find yield for (e.g. BNB, USDT, ETH)'),
    chain: z.string().default('bsc').describe('Blockchain network. Default: bsc'),
  },
  async ({ address, token, chain }) => {
    try {
      const res = await analyzeDeFi({ address, token, mode: 'yield', chain });
      return { content: [{ type: 'text', text: formatDeFiText(res) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error analyzing DeFi yield: ${err.message}` }], isError: true };
    }
  }
);

// ─── Tool 7: Evaluate Agent Decision ─────────────────────────────────────────
server.tool(
  'evaluate_agent_decision',
  `Synthesizes multi-source security findings and risk scores to provide autonomous AI agents with an explicit ALLOW, WARN, or BLOCK trade decision.

REQUIRED PARAMETERS:
  - context: Description of the intended action (e.g. "Buy $5,000 worth of XYZ token on PancakeSwap")

OPTIONAL PARAMETERS:
  - findings: List of risk findings from previous audits (array of strings)
  - risk_score: Composite risk score from 0-100 (number)
  - question: Specific query for the AI decision engine

EXAMPLE USAGE:
  {
    "context": "Autonomous agent preparing $5,000 buy of CAKE on PancakeSwap",
    "findings": ["Token is verified", "No honeypot detected", "Liquidity $48M"],
    "risk_score": 12
  }

RETURNS: ALLOW / WARN / BLOCK decision with full reasoning, risk findings, and actionable recommendations.`,
  {
    context: z.string().describe('Description of the intended action or trade'),
    findings: z.array(z.string()).optional().default([]).describe('Risk findings from previous audits'),
    risk_score: z.number().min(0).max(100).optional().describe('Composite risk score 0-100'),
    question: z.string().optional().describe('Optional specific query for the AI decision engine'),
  },
  async ({ context, findings, risk_score, question }) => {
    try {
      const res = await evaluateDecision({ context, findings, risk_score, question, chain: 'bsc' });
      return { content: [{ type: 'text', text: formatDecisionText(res) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error evaluating decision: ${err.message}` }], isError: true };
    }
  }
);

// ─── Tool 8: Get Binance Market Alpha ────────────────────────────────────────
server.tool(
  'get_binance_market_alpha',
  `Fetch live Binance Spot market intelligence including 24h ticker, order book depth imbalance, spread, funding rates, and market regime.

REQUIRED PARAMETERS:
  - symbol: Trading pair symbol (e.g. BNBUSDT, BTCUSDT, ETHUSDT, CAKEUSDT)

EXAMPLE USAGE:
  { "symbol": "BNBUSDT" }
  { "symbol": "BTCUSDT" }

RETURNS: Live spot price, 24h high/low/volume, bid/ask spread, orderbook bid vs ask depth (buyers vs sellers), top 5 bid and ask levels, market regime classification, and funding rate (if available).`,
  {
    symbol: z.string().default('BNBUSDT').describe('Trading pair symbol: BNBUSDT, BTCUSDT, ETHUSDT, CAKEUSDT, SOLUSDT, etc.'),
  },
  async ({ symbol }) => {
    try {
      const alpha = await binanceAdapter.getMarketAlpha(symbol);
      if (!alpha) {
        return { content: [{ type: 'text', text: `Could not fetch Binance market data for ${symbol}. Please try again shortly.` }], isError: true };
      }
      return { content: [{ type: 'text', text: formatMarketDepthText({ data: alpha }) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error fetching Binance market alpha: ${err.message}` }], isError: true };
    }
  }
);

// ─── Tool 9: Unified Auto-Detect Auditor ─────────────────────────────────────
server.tool(
  'audit_unified',
  `Smart single-query engine — automatically detects whether the input is a token address, smart contract, wallet address, transaction hash, or protocol slug and runs the appropriate audit.

REQUIRED PARAMETERS:
  - query: Any EVM address (0x...), transaction hash (0x...), or protocol slug (e.g. "pancakeswap")
  - chain: The blockchain network. Default: bsc

EXAMPLE USAGE:
  { "query": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "chain": "bsc" }  -> Token audit
  { "query": "0x10ED43C718714eb63d5aA57B78B54704E256024E", "chain": "bsc" }  -> Contract audit
  { "query": "pancakeswap", "chain": "bsc" }                                -> Protocol audit
  { "query": "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060", "chain": "ethereum" }  -> Transaction audit

RETURNS: Automatically detected audit type and full readable security report.`,
  {
    query: z.string().describe('Any EVM address, transaction hash, or protocol slug'),
    chain: z.string().default('bsc').describe('Blockchain network. Default: bsc'),
  },
  async ({ query, chain }) => {
    try {
      const res = await analyzeUnified({ query, type: 'auto', chain });
      return { content: [{ type: 'text', text: formatUnifiedText(res) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error running unified audit: ${err.message}` }], isError: true };
    }
  }
);

// Start MCP server over stdio
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] AUDIT Binance Agent OS MCP Server running on stdio — Readable Text Mode Active');
}

run().catch((err) => {
  console.error('Fatal error running MCP server:', err);
  process.exit(1);
});