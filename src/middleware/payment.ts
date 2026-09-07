// src/middleware/payment.ts
// OKX x402 payment middleware — gates all intelligence endpoints behind pay-per-call

import { paymentMiddleware, x402ResourceServer } from '@okxweb3/x402-express';
import { ExactEvmScheme } from '@okxweb3/x402-evm/exact/server';
import { OKXFacilitatorClient } from '@okxweb3/x402-core';
import logger from '../lib/logger.js';

// X Layer Mainnet (eip155:196) or Testnet (eip155:1952)
const NETWORK = (process.env.NETWORK || 'eip155:1952') as `${string}:${string}`;
const PAY_TO = process.env.PAY_TO_ADDRESS || '';

export function buildPaymentMiddleware() {
  if (process.env.ENABLE_PAYMENT === 'false') {
    logger.info('[payment] ENABLE_PAYMENT=false in .env — payment middleware DISABLED (Free Mode active)');
    return null;
  }

  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;
  const payTo = process.env.PAY_TO_ADDRESS;

  const isPlaceholder = (val?: string) => !val || val.startsWith('your_') || val.includes('YourWalletAddress');

  if (isPlaceholder(apiKey) || isPlaceholder(secretKey) || isPlaceholder(passphrase)) {
    logger.warn('[payment] OKX credentials not set or placeholder — payment middleware DISABLED (Free Mode active). Set real OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE to enable billing.');
    return null;
  }

  if (isPlaceholder(payTo)) {
    logger.warn('[payment] PAY_TO_ADDRESS not set or placeholder — payment middleware DISABLED (Free Mode active). Set real PAY_TO_ADDRESS to enable billing.');
    return null;
  }

  const facilitatorClient = new OKXFacilitatorClient({
    apiKey: process.env.OKX_API_KEY!,
    secretKey: process.env.OKX_SECRET_KEY!,
    passphrase: process.env.OKX_PASSPHRASE!,
  });

  const resourceServer = new x402ResourceServer(facilitatorClient);
  resourceServer.register(NETWORK, new ExactEvmScheme());

  logger.info('[payment] OKX x402 payment middleware enabled', { network: NETWORK, payTo: PAY_TO.slice(0, 10) + '...' });

  return paymentMiddleware(
    {
      // ─── Unified endpoint ─────────────────────────────────────────────
      'POST /analyze': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.05' }],
        description: 'Unified blockchain intelligence — auto-detects and routes to the correct module',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['query'],
            parameters: {
              query: { type: 'string', description: 'EVM address (0x...), tx hash (0x...), or protocol name (e.g. uniswap)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
              type: { type: 'string', enum: ['auto', 'wallet', 'token', 'contract', 'transaction', 'protocol'], default: 'auto' },
            },
          },
        }),
      },

      // ─── Wallet endpoints ─────────────────────────────────────────────
      'POST /wallet/analyze': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.03' }],
        description: 'Full wallet intelligence: reputation, whale score, behavior, protocol usage, security flags',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM wallet address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /wallet/score': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.01' }],
        description: 'Wallet reputation and whale score',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM wallet address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /wallet/history': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'Wallet transaction history and pattern analysis',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM wallet address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /wallet/classify': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.01' }],
        description: 'Wallet type classification: whale, bot, DeFi user, retail trader',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM wallet address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },

      // ─── Contract endpoints ────────────────────────────────────────────
      'POST /contract/analyze': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.04' }],
        description: 'Full contract intelligence: verification, proxy, privileged functions, AI summary, security',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM contract address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /contract/summarize': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'AI-powered plain-English contract summary using Groq Llama 3.3',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM contract address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /contract/security': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.03' }],
        description: 'Contract security analysis: GoPlus scan, selfdestruct, external calls',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM contract address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /contract/functions': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'Contract ABI analysis and privileged function identification',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM contract address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },

      // ─── Token endpoints ───────────────────────────────────────────────
      'POST /token/analyze': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.04' }],
        description: 'Full token intelligence: honeypot, rug indicators, holders, liquidity, market data',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM token contract address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /token/risk': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'Token risk score: GoPlus security scan, honeypot detection, rug indicators',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM token contract address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /token/holders': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'Token holder distribution and concentration analysis',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM token contract address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /token/liquidity': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'Token DEX liquidity analysis across pools',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['address'],
            parameters: {
              address: { type: 'string', description: 'Target EVM token contract address (0x...)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },

      // ─── Transaction endpoints ─────────────────────────────────────────
      'POST /transaction/analyze': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.03' }],
        description: 'Full transaction intelligence: method decode, token transfers, security checks, AI explanation',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['txHash'],
            parameters: {
              txHash: { type: 'string', description: '32-byte transaction hash (0x + 64 hex characters)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /transaction/explain': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'AI-powered plain-English transaction explanation',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['txHash'],
            parameters: {
              txHash: { type: 'string', description: '32-byte transaction hash (0x + 64 hex characters)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /transaction/simulate': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.03' }],
        description: 'Pre-signature transaction simulation with outcome prediction',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['txHash'],
            parameters: {
              txHash: { type: 'string', description: '32-byte transaction hash (0x + 64 hex characters)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },

      // ─── Protocol endpoints ────────────────────────────────────────────
      'POST /protocol/analyze': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.04' }],
        description: 'Full protocol intelligence: TVL, audits, security history, governance',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['query'],
            parameters: {
              query: { type: 'string', description: 'Protocol contract address (0x...) or protocol name (e.g. uniswap)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /protocol/risk': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'Protocol risk score: audit status, TVL trends, exploit history',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['query'],
            parameters: {
              query: { type: 'string', description: 'Protocol contract address (0x...) or protocol name (e.g. aave)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /protocol/summary': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'Protocol overview and market position summary',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['query'],
            parameters: {
              query: { type: 'string', description: 'Protocol contract address (0x...) or protocol name (e.g. curve)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },

      // ─── DeFi endpoints ────────────────────────────────────────────────
      'POST /defi/analyze': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.04' }],
        description: 'Full DeFi intelligence: positions, liquidation risk, yield opportunities',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: [],
            parameters: {
              address: { type: 'string', description: 'Optional wallet or pool address (0x...)' },
              token: { type: 'string', description: 'Optional token symbol (e.g. USDC)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
              mode: { type: 'string', enum: ['yield', 'risk', 'position'], default: 'yield' },
            },
          },
        }),
      },
      'POST /defi/risk': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'DeFi position risk: health factor, liquidation distance, IL estimation',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: [],
            parameters: {
              address: { type: 'string', description: 'Optional wallet or pool address (0x...)' },
              token: { type: 'string', description: 'Optional token symbol' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },
      'POST /defi/yield': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.02' }],
        description: 'Yield optimization: top APY pools, stablecoin yields, risk comparison',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: [],
            parameters: {
              token: { type: 'string', description: 'Optional token symbol (e.g. USDC)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
            },
          },
        }),
      },

      // ─── Decision Engine ───────────────────────────────────────────────
      'POST /decision/evaluate': {
        accepts: [{ scheme: 'exact', network: NETWORK, payTo: PAY_TO, price: '$0.05' }],
        description: 'AI decision engine: synthesizes intelligence findings into actionable recommendations',
        mimeType: 'application/json',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            required: ['context'],
            parameters: {
              context: { type: 'string', description: 'Description of what to evaluate (e.g. token swap risk, protocol safety)' },
              chain: { type: 'string', description: 'Target blockchain: ethereum | base | xlayer', default: 'ethereum' },
              findings: { type: 'array', items: { type: 'string' }, description: 'Optional findings from other modules' },
              question: { type: 'string', description: 'Optional specific decision question' },
            },
          },
        }),
      },
    },
    resourceServer,
  );
}
