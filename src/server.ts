// src/server.ts
// AUDIT — The Intelligence & Security Layer for Binance Agent OS

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZodError, z } from 'zod';

import logger from './lib/logger.js';
import cache from './lib/cache.js';
import { ChainIntelError } from './lib/errors.js';
import { SUPPORTED_CHAINS } from './types/chains.js';

// Adapters
import { binanceAdapter } from './adapters/binance.js';

// Modules
import { analyzeWallet, WalletAnalyzeSchema } from './modules/wallet/analyze.js';
import { analyzeContract, ContractAnalyzeSchema } from './modules/contract/analyze.js';
import { analyzeToken, TokenAnalyzeSchema } from './modules/token/analyze.js';
import { analyzeTransaction, TransactionAnalyzeSchema } from './modules/transaction/analyze.js';
import { analyzeProtocol, ProtocolAnalyzeSchema } from './modules/protocol/analyze.js';
import { analyzeDeFi, DeFiAnalyzeSchema } from './modules/defi/analyze.js';
import { evaluateDecision, DecisionEvaluateSchema } from './modules/decision/evaluate.js';
import { analyzeUnified, UnifiedAnalyzeSchema } from './modules/unified/analyze.js';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Security & Parsing
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (120 req/min for development and agent workloads)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', error: 'rate_limit_exceeded', message: 'Too many requests, please slow down.' },
});
app.use(limiter);

// Serve frontend UI from public/
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
const assetsDir = path.join(__dirname, '..', 'assets');
app.use('/assets', express.static(assetsDir));

// SPA Client-side route fallbacks
app.get(['/console', '/docs', '/help'], (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'AUDIT Intelligence & Security Engine for Binance Agent OS',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    chains: SUPPORTED_CHAINS,
  });
});

// MCP Discovery Endpoint — Full Parameter Schemas & Examples
app.get('/mcp/tools', (_req: Request, res: Response) => {
  res.json({
    name: 'audit-binance-agent-os',
    version: '1.0.0',
    description: 'AUDIT — Security intelligence, risk scoring, and real-time market data for Binance Agent OS and all MCP-compatible AI agents.',
    executeEndpoint: 'POST /mcp/execute',
    note: 'All tool responses are returned as clean, readable text. No JSON parsing required by the agent.',
    tools: [
      {
        name: 'audit_token',
        description: 'Audit a token for honeypots, buy/sell taxes, blacklist functions, liquidity, holder concentration, and AI risk verdict.',
        parameters: {
          address: { type: 'string', required: true, description: 'Token contract address (0x..., 42 chars)', example: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82' },
          chain: { type: 'string', required: false, default: 'bsc', options: ['bsc', 'ethereum', 'base', 'arbitrum', 'polygon', 'opbnb'], description: 'Blockchain network. Default: bsc' },
        },
        example_call: { tool: 'audit_token', parameters: { address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', chain: 'bsc' } },
      },
      {
        name: 'audit_contract',
        description: 'Smart contract security audit: source verification, proxy detection, privileged functions, exploit vectors, AI summary, verdict.',
        parameters: {
          address: { type: 'string', required: true, description: 'Smart contract address (0x..., 42 chars)', example: '0x10ED43C718714eb63d5aA57B78B54704E256024E' },
          chain: { type: 'string', required: false, default: 'bsc', options: ['bsc', 'ethereum', 'base', 'arbitrum', 'polygon'] },
        },
        example_call: { tool: 'audit_contract', parameters: { address: '0x10ED43C718714eb63d5aA57B78B54704E256024E', chain: 'bsc' } },
      },
      {
        name: 'audit_transaction',
        description: 'Simulate and explain a transaction. Detects phishing, drainer contracts, abnormal gas, and unexpected token transfers.',
        parameters: {
          txHash: { type: 'string', required: true, description: 'Transaction hash (0x..., 66 chars)', example: '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060' },
          chain: { type: 'string', required: false, default: 'bsc', options: ['bsc', 'ethereum', 'base', 'arbitrum'] },
        },
        example_call: { tool: 'audit_transaction', parameters: { txHash: '0x5c504ed...', chain: 'bsc' } },
      },
      {
        name: 'audit_wallet',
        description: 'Wallet risk profiling: balance, transaction frequency, mixer detection, bot probability, whale score, reputation, malicious flags.',
        parameters: {
          address: { type: 'string', required: true, description: 'EVM wallet address (0x..., 42 chars)', example: '0x8894e0a0c962cb723c1976a4421c95949be2d4e3' },
          chain: { type: 'string', required: false, default: 'bsc', options: ['bsc', 'ethereum', 'base', 'arbitrum', 'polygon'] },
        },
        example_call: { tool: 'audit_wallet', parameters: { address: '0x8894e0a0c962cb723c1976a4421c95949be2d4e3', chain: 'bsc' } },
      },
      {
        name: 'audit_protocol',
        description: 'Protocol TVL, audit records, historical exploits, active chains, and security assessment.',
        parameters: {
          query: { type: 'string', required: true, description: 'Protocol slug or name (e.g. pancakeswap, venus, aave, uniswap)', example: 'pancakeswap' },
          chain: { type: 'string', required: false, default: 'bsc' },
        },
        example_call: { tool: 'audit_protocol', parameters: { query: 'pancakeswap', chain: 'bsc' } },
      },
      {
        name: 'audit_defi_yield',
        description: 'Compare DeFi yield opportunities, impermanent loss risk, liquidation distances, and collateral ratios.',
        parameters: {
          token: { type: 'string', required: false, description: 'Token symbol to find yield for (e.g. BNB, USDT, ETH, CAKE)', example: 'BNB' },
          address: { type: 'string', required: false, description: 'Token or pool contract address (optional alternative to token)' },
          chain: { type: 'string', required: false, default: 'bsc' },
        },
        example_call: { tool: 'audit_defi_yield', parameters: { token: 'BNB', chain: 'bsc' } },
      },
      {
        name: 'evaluate_agent_decision',
        description: 'AI decision engine: synthesizes security findings into ALLOW / WARN / BLOCK verdict for autonomous agent actions.',
        parameters: {
          context: { type: 'string', required: true, description: 'Description of the intended action or trade', example: 'Buy $5,000 worth of CAKE on PancakeSwap' },
          findings: { type: 'array', required: false, description: 'Risk findings from previous audits (array of strings)', example: ['No honeypot', 'Liquidity $48M', 'Verified token'] },
          risk_score: { type: 'number', required: false, description: 'Composite risk score 0-100', example: 12 },
          question: { type: 'string', required: false, description: 'Specific query for the AI decision engine', example: 'Is this safe to execute?' },
        },
        example_call: { tool: 'evaluate_agent_decision', parameters: { context: 'Buy $5,000 of CAKE on PancakeSwap', findings: ['Verified token', 'No honeypot', 'Liquidity $48M'], risk_score: 12 } },
      },
      {
        name: 'get_binance_market_alpha',
        description: 'Live Binance Spot market: current price, 24h metrics, bid/ask spread, orderbook depth, top 5 bids and asks, market regime.',
        parameters: {
          symbol: { type: 'string', required: false, default: 'BNBUSDT', description: 'Trading pair symbol', example: 'BNBUSDT', options: ['BNBUSDT', 'BTCUSDT', 'ETHUSDT', 'CAKEUSDT', 'SOLUSDT'] },
        },
        example_call: { tool: 'get_binance_market_alpha', parameters: { symbol: 'BNBUSDT' } },
      },
      {
        name: 'audit_unified',
        description: 'Auto-detects address type (token, contract, wallet, tx hash, protocol) and runs the appropriate full security audit.',
        parameters: {
          query: { type: 'string', required: true, description: 'Any EVM address (0x...), transaction hash (0x...), or protocol slug', example: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82' },
          chain: { type: 'string', required: false, default: 'bsc' },
        },
        example_call: { tool: 'audit_unified', parameters: { query: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', chain: 'bsc' } },
      },
    ],
  });
});

// Binance Market Alpha & Orderbook Depth Endpoints (Support GET & POST)
const handleMarketDepth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = (req.body?.symbol || req.query.symbol as string || 'BNBUSDT');
    const alpha = await binanceAdapter.getMarketAlpha(symbol);
    if (!alpha) {
      res.status(404).json({ status: 'error', message: `No Binance market data available for ${symbol}` });
      return;
    }
    res.json({ status: 'success', data: alpha });
  } catch (err) {
    next(err);
  }
};

app.get('/market/binance', handleMarketDepth);
app.get('/market/depth', handleMarketDepth);
app.post('/market/depth', handleMarketDepth);


// Helper: validate and register POST endpoints
function registerEndpoint(routePath: string, schema: z.ZodTypeAny, fn: (input: any) => Promise<unknown>) {
  app.post(routePath, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = schema.parse({ ...req.body, ...req.query });
      const result = await fn(input);
      res.json(result);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          status: 'error',
          error: 'validation_error',
          message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  });
}

// Register Module Routes
registerEndpoint('/analyze', UnifiedAnalyzeSchema, analyzeUnified);

// Wallet
registerEndpoint('/wallet/analyze', WalletAnalyzeSchema, analyzeWallet);
registerEndpoint('/wallet/score', WalletAnalyzeSchema, analyzeWallet);
registerEndpoint('/wallet/history', WalletAnalyzeSchema, analyzeWallet);

// Contract
registerEndpoint('/contract/analyze', ContractAnalyzeSchema, analyzeContract);
registerEndpoint('/contract/summarize', ContractAnalyzeSchema, analyzeContract);
registerEndpoint('/contract/security', ContractAnalyzeSchema, analyzeContract);

// Token
registerEndpoint('/token/analyze', TokenAnalyzeSchema, analyzeToken);
registerEndpoint('/token/risk', TokenAnalyzeSchema, analyzeToken);
registerEndpoint('/token/holders', TokenAnalyzeSchema, analyzeToken);

// Transaction
registerEndpoint('/transaction/analyze', TransactionAnalyzeSchema, analyzeTransaction);
registerEndpoint('/transaction/explain', TransactionAnalyzeSchema, analyzeTransaction);
registerEndpoint('/transaction/simulate', TransactionAnalyzeSchema, analyzeTransaction);

// Protocol
registerEndpoint('/protocol/analyze', ProtocolAnalyzeSchema, analyzeProtocol);
registerEndpoint('/protocol/risk', ProtocolAnalyzeSchema, analyzeProtocol);

// DeFi
registerEndpoint('/defi/analyze', DeFiAnalyzeSchema, analyzeDeFi);
registerEndpoint('/defi/yield', DeFiAnalyzeSchema, analyzeDeFi);

// Decision Engine (ALLOW / WARN / BLOCK)
registerEndpoint('/decision/evaluate', DecisionEvaluateSchema, evaluateDecision);


// ─── MCP Execute Endpoint ────────────────────────────────────────────────────
// Allows agents using HTTP transport to call any AUDIT tool by name
// Returns clean readable text, not JSON
app.post('/mcp/execute', async (req: Request, res: Response, next: NextFunction) => {
  const { tool, parameters = {} } = req.body || {};

  if (!tool) {
    res.status(400).json({
      status: 'error',
      message: 'Missing required field: tool. See GET /mcp/tools for available tools and their parameters.',
    });
    return;
  }

  try {
    let rawResult: any;
    let formattedText: string;

    switch (tool) {
      case 'audit_token':
        rawResult = await analyzeToken({ address: parameters.address, chain: parameters.chain || 'bsc' });
        formattedText = formatTokenText(rawResult);
        break;
      case 'audit_contract':
        rawResult = await analyzeContract({ address: parameters.address, chain: parameters.chain || 'bsc' });
        formattedText = formatContractText(rawResult);
        break;
      case 'audit_wallet':
        rawResult = await analyzeWallet({ address: parameters.address, chain: parameters.chain || 'bsc' });
        formattedText = formatWalletText(rawResult);
        break;
      case 'audit_transaction':
        rawResult = await analyzeTransaction({ txHash: parameters.txHash, chain: parameters.chain || 'bsc' });
        formattedText = formatTransactionText(rawResult);
        break;
      case 'audit_protocol':
        rawResult = await analyzeProtocol({ query: parameters.query, chain: parameters.chain || 'bsc' });
        formattedText = formatProtocolText(rawResult);
        break;
      case 'audit_defi_yield':
        rawResult = await analyzeDeFi({ address: parameters.address, token: parameters.token, mode: 'yield', chain: parameters.chain || 'bsc' });
        formattedText = formatDeFiText(rawResult);
        break;
      case 'evaluate_agent_decision':
        rawResult = await evaluateDecision({ context: parameters.context, findings: parameters.findings || [], risk_score: parameters.risk_score, question: parameters.question, chain: 'bsc' });
        formattedText = formatDecisionText(rawResult);
        break;
      case 'get_binance_market_alpha': {
        const alpha = await binanceAdapter.getMarketAlpha(parameters.symbol || 'BNBUSDT');
        formattedText = formatMarketDepthText({ data: alpha });
        break;
      }
      case 'audit_unified':
        rawResult = await analyzeUnified({ query: parameters.query, type: 'auto', chain: parameters.chain || 'bsc' });
        formattedText = formatUnifiedText(rawResult);
        break;
      default:
        res.status(404).json({
          status: 'error',
          message: `Unknown tool: "${tool}". See GET /mcp/tools for available tools.`,
        });
        return;
    }

    res.json({
      status: 'success',
      tool,
      content: [{ type: 'text', text: formattedText }],
    });
  } catch (err) {
    next(err);
  }
});

// Error Handling
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      error: 'validation_error',
      message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err instanceof ChainIntelError) {
    res.status(err.statusCode).json({
      status: 'error',
      error: err.name,
      message: err.message,
      module: err.module,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  logger.error('[server] Unhandled error', { err });
  res.status(500).json({
    status: 'error',
    error: 'internal_error',
    message: err instanceof Error ? err.message : 'An unexpected error occurred.',
    timestamp: new Date().toISOString(),
  });
});

// Root / Fallback
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'AUDIT API & MCP for Binance Agent OS',
    version: '1.0.0',
    endpoints: [
      'POST /analyze',
      'POST /token/analyze',
      'POST /contract/analyze',
      'POST /transaction/analyze',
      'POST /wallet/analyze',
      'POST /protocol/analyze',
      'POST /defi/analyze',
      'POST /decision/evaluate',
      'GET /market/binance?symbol=BNBUSDT',
      'GET /mcp/tools',
    ],
    chains: SUPPORTED_CHAINS,
  });
});

async function start() {
  await cache.connect();
  app.listen(PORT, () => {
    logger.info(`✨ AUDIT Engine running at http://localhost:${PORT}`);
    logger.info(`⚡ Built for Binance Agent OS — Track A Hackathon`);
    logger.info(`🔗 Primary Chain: BNB Smart Chain (BSC) | Supported: ${SUPPORTED_CHAINS.join(', ')}`);
  });
}

if (!process.env.VERCEL) {
  start().catch((err) => {
    logger.error('Failed to start server', { err });
    process.exit(1);
  });
}

export default app;
