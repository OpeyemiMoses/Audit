// src/modules/unified/analyze.ts
// Unified /analyze endpoint — auto-detects input type and routes to correct module

import { z } from 'zod';
import { getChainConfig } from '../../types/chains.js';
import { buildResponse } from '../../types/response.js';
import { isContract } from '../../adapters/alchemy.js';
import { analyzeToken } from '../token/analyze.js';
import { analyzeWallet } from '../wallet/analyze.js';
import { analyzeContract } from '../contract/analyze.js';
import { analyzeTransaction } from '../transaction/analyze.js';
import { analyzeProtocol } from '../protocol/analyze.js';
import logger from '../../lib/logger.js';

export const UnifiedAnalyzeSchema = z.object({
  // Any of: EVM address (0x + 40 hex), tx hash (0x + 64 hex), or protocol name
  query: z.string().min(1, 'Provide an address, transaction hash, or protocol name'),
  chain: z.string().default('ethereum'),
  // Optional type override
  type: z.enum(['auto', 'wallet', 'token', 'contract', 'transaction', 'protocol']).default('auto'),
});

export type UnifiedAnalyzeInput = z.infer<typeof UnifiedAnalyzeSchema>;

type InputType = 'wallet' | 'token' | 'contract' | 'transaction' | 'protocol' | 'unknown';

const extractTxHash = (s: string) => s.match(/0x[a-fA-F0-9]{64}/i)?.[0];
const extractAddress = (s: string) => s.match(/0x[a-fA-F0-9]{40}/i)?.[0];

async function detectInputType(query: string, chain: string): Promise<{ type: InputType; cleanQuery: string }> {
  const txHash = extractTxHash(query);
  if (txHash) return { type: 'transaction', cleanQuery: txHash };

  const address = extractAddress(query);
  if (address) {
    // Default to contract analysis (which checks if it's a token/contract first)
    return { type: 'contract', cleanQuery: address };
  }

  // Clean out common conversational filler words if protocol name
  const cleanProtocol = query
    .replace(/(?:analyze|check|inspect|tell me about|what is|how is|is|safe|protocol|token|wallet|contract|on|ethereum|base|xlayer)/gi, '')
    .trim();

  return { type: 'protocol', cleanQuery: cleanProtocol || query };
}

export async function analyzeUnified(input: UnifiedAnalyzeInput) {
  const start = Date.now();
  const { query, chain } = input;
  const chainConfig = getChainConfig(chain);

  // Extract clean entity target from potential natural language sentence
  const { type: autoType, cleanQuery } = await detectInputType(query, chain);
  const targetQuery = cleanQuery || query;
  const detectedType = input.type !== 'auto' ? (input.type as InputType) : autoType;

  logger.info('[unified/analyze] Starting', { rawQuery: query, targetQuery, chain, type: detectedType });

  logger.info('[unified/analyze] Detected type', { type: detectedType });

  // ─── Route to module ──────────────────────────────────────────────────────
  switch (detectedType) {
    case 'transaction':
      return analyzeTransaction({ txHash: targetQuery, chain });

    case 'contract': {
      // Try token analysis first (more useful for ERC-20s), fall back to contract
      // Heuristic: GoPlus token data exists → it's a token
      try {
        const tokenResult = await analyzeToken({ address: targetQuery, chain }) as Record<string, unknown>;
        // If GoPlus returned actual token data (has a name), it's a token
        const data = tokenResult['data'] as Record<string, unknown>;
        if (data?.['name'] && data['name'] !== 'Unknown' && data['symbol'] && data['symbol'] !== '???') {
          return { ...tokenResult, module: 'unified/auto→token/analyze', data: { ...data, detected_type: 'token' } };
        }
      } catch { /* fallback to contract */ }
      const contractResult = await analyzeContract({ address: targetQuery, chain }) as Record<string, unknown>;
      const cData = contractResult['data'] as Record<string, unknown>;
      return { ...contractResult, module: 'unified/auto→contract/analyze', data: { ...cData, detected_type: 'contract' } };
    }

    case 'wallet': {
      const walletResult = await analyzeWallet({ address: targetQuery, chain }) as Record<string, unknown>;
      const wData = walletResult['data'] as Record<string, unknown>;
      return { ...walletResult, module: 'unified/auto→wallet/analyze', data: { ...wData, detected_type: 'wallet' } };
    }

    case 'protocol': {
      const protocolResult = await analyzeProtocol({ query: targetQuery, chain }) as Record<string, unknown>;
      const pData = protocolResult['data'] as Record<string, unknown>;
      return { ...protocolResult, module: 'unified/auto→protocol/analyze', data: { ...pData, detected_type: 'protocol' } };
    }

    default:
      return buildResponse(
        'unified/analyze', chain, chainConfig.id,
        `Could not determine input type for: "${query}". Provide an EVM address, transaction hash (0x + 64 chars), or protocol name.`,
        0, 0,
        [{ id: 'unknown_type', severity: 'warning', title: 'Unknown input type', description: 'Could not classify input.', source: 'ChainIntel' }],
        ['Use /wallet/analyze, /token/analyze, /contract/analyze, /transaction/analyze, or /protocol/analyze directly'],
        [],
        { query, detected_type: 'unknown' },
        start, false, [],
      );
  }
}
