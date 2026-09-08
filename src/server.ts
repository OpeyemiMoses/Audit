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

// MCP Discovery Endpoint
app.get('/mcp/tools', (_req: Request, res: Response) => {
  res.json({
    name: 'audit-binance-agent-os',
    version: '1.0.0',
    transport: 'stdio',
    description: 'Model Context Protocol (MCP) server providing security, risk scoring, and market alpha for Binance Agent OS agents.',
    tools: [
      { name: 'audit_token', description: 'Analyze token address for honeypots, taxes, and liquidity risks' },
      { name: 'audit_contract', description: 'Inspect smart contract bytecode, verification, and vulnerabilities' },
      { name: 'audit_transaction', description: 'Simulate and explain transactions before execution' },
      { name: 'audit_wallet', description: 'Analyze wallet balance, counterparty risk, and liquidation exposure' },
      { name: 'audit_protocol', description: 'Protocol TVL, security audit records, and hack history' },
      { name: 'audit_defi_yield', description: 'Compare yield opportunities and liquidation distances' },
      { name: 'evaluate_agent_decision', description: 'Synthesizes security findings into ALLOW / WARN / BLOCK decision' },
      { name: 'get_binance_market_alpha', description: 'Real-time Binance 24h ticker, order book depth, and funding rates' },
      { name: 'audit_unified', description: 'Auto-detects address/hash/protocol and runs appropriate auditor' },
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

start().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});

export default app;
