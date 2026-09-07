// src/mcp-server.ts
// Binance Agent OS — Model Context Protocol (MCP) Server for AUDIT

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import dotenv from 'dotenv';
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

dotenv.config();

// Create MCP Server instance
const server = new McpServer({
  name: 'audit-binance-agent-os',
  version: '1.0.0',
});

// Tool 1: Audit Token
server.tool(
  'audit_token',
  'Audit a cryptocurrency or meme token for security risks, honeypots, buy/sell taxes, blacklist functions, and market cap on BNB Chain, Ethereum, Base, etc.',
  {
    address: z.string().describe('The token contract address (0x...)'),
    chain: z.string().default('bsc').describe('The blockchain network (bsc, ethereum, base, arbitrum, polygon, opbnb)'),
  },
  async ({ address, chain }) => {
    try {
      const res = await analyzeToken({ address, chain });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error auditing token: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 2: Audit Contract
server.tool(
  'audit_contract',
  'Inspect a smart contract for verified source code, proxy implementations, vulnerability patterns, and AI-generated security summary.',
  {
    address: z.string().describe('The smart contract address (0x...)'),
    chain: z.string().default('bsc').describe('The blockchain network (bsc, ethereum, base, arbitrum, polygon)'),
  },
  async ({ address, chain }) => {
    try {
      const res = await analyzeContract({ address, chain });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error auditing contract: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 3: Audit Transaction
server.tool(
  'audit_transaction',
  'Simulate or explain a transaction hash or payload before execution to identify phishing, drainer patterns, or abnormal gas usage.',
  {
    txHash: z.string().describe('Transaction hash to inspect (0x...)'),
    chain: z.string().default('bsc').describe('The blockchain network (bsc, ethereum, base, arbitrum)'),
  },
  async ({ txHash, chain }) => {
    try {
      const res = await analyzeTransaction({ txHash, chain });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error analyzing transaction: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 4: Audit Wallet
server.tool(
  'audit_wallet',
  'Analyze a wallet address for counterparty risk, protocol interactions, asset balances, and suspicious activity.',
  {
    address: z.string().describe('The EVM wallet address to audit (0x...)'),
    chain: z.string().default('bsc').describe('The blockchain network (bsc, ethereum, base, arbitrum, polygon)'),
  },
  async ({ address, chain }) => {
    try {
      const res = await analyzeWallet({ address, chain });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error auditing wallet: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 5: Audit Protocol
server.tool(
  'audit_protocol',
  'Retrieve total value locked (TVL), security audits, historical exploits, and multi-chain status for DeFi protocols.',
  {
    query: z.string().describe('The protocol slug or name (e.g. pancakeswap, venus, aave, uniswap)'),
    chain: z.string().default('bsc').describe('The blockchain network (bsc, ethereum, etc.)'),
  },
  async ({ query, chain }) => {
    try {
      const res = await analyzeProtocol({ query, chain });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error analyzing protocol: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 6: Audit DeFi Yield
server.tool(
  'audit_defi_yield',
  'Compare DeFi yield opportunities, impermanent loss risk, and liquidation distance across BNB Chain and EVM protocols.',
  {
    address: z.string().optional().describe('Token or pool contract address'),
    token: z.string().optional().describe('Token symbol to find yield for (e.g. BNB, USDT, ETH)'),
    chain: z.string().default('bsc').describe('The blockchain network'),
  },
  async ({ address, token, chain }) => {
    try {
      const res = await analyzeDeFi({ address, token, mode: 'yield', chain });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error analyzing DeFi yield: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 7: Evaluate AI Agent Decision (ALLOW / WARN / BLOCK)
server.tool(
  'evaluate_agent_decision',
  'Synthesizes multi-source security findings and risk scores to provide autonomous AI agents with an explicit ALLOW, WARN, or BLOCK trade decision.',
  {
    context: z.string().describe('Description of the intended action or trade (e.g. "Buy $5,000 worth of XYZ token on PancakeSwap")'),
    findings: z.array(z.string()).optional().default([]).describe('List of risk findings or alerts from previous audits'),
    risk_score: z.number().min(0).max(100).optional().describe('Calculated composite risk score (0-100)'),
    question: z.string().optional().describe('Optional specific query for the AI decision engine'),
  },
  async ({ context, findings, risk_score, question }) => {
    try {
      const res = await evaluateDecision({ context, findings, risk_score, question, chain: 'bsc' });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error evaluating decision: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 8: Get Binance Market Alpha
server.tool(
  'get_binance_market_alpha',
  'Fetch live Binance Spot & Futures market intelligence including 24h ticker, order book depth imbalance, spread, funding rates, and market regime.',
  {
    symbol: z.string().default('BNBUSDT').describe('Trading pair symbol (e.g. BNBUSDT, BTCUSDT, ETHUSDT, SOLUSDT)'),
  },
  async ({ symbol }) => {
    try {
      const alpha = await binanceAdapter.getMarketAlpha(symbol);
      if (!alpha) {
        return {
          content: [{ type: 'text', text: `Could not fetch Binance market data for ${symbol}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(alpha, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error fetching Binance market alpha: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 9: Unified Auto-Detect Auditor
server.tool(
  'audit_unified',
  'Smart single-query engine — auto-detects whether the input is a token address, smart contract, wallet, tx hash, or protocol and routes automatically.',
  {
    query: z.string().describe('Address, transaction hash, or protocol slug'),
    chain: z.string().default('bsc').describe('The blockchain network'),
  },
  async ({ query, chain }) => {
    try {
      const res = await analyzeUnified({ query, type: 'auto', chain });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error running unified audit: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Start MCP server over stdio
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('[MCP] AUDIT Binance Agent OS MCP Server running on stdio');
}

run().catch((err) => {
  console.error('Fatal error running MCP server:', err);
  process.exit(1);
});
