// src/adapters/defillama.ts
// DeFiLlama API — fully free, no API key needed
// Docs: https://defillama.com/docs/api

import axios from 'axios';
import logger from '../lib/logger.js';

const BASE = 'https://api.llama.fi';
const COINS_BASE = 'https://coins.llama.fi';

async function llamaGet<T>(url: string, params?: Record<string, string>): Promise<T | null> {
  try {
    const res = await axios.get<T>(url, { params, timeout: 10000 });
    return res.data;
  } catch (err) {
    logger.warn('[defillama] Request failed', { url, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ─── Protocol Types ───────────────────────────────────────────────────────────

export interface DefiLlamaProtocol {
  id: string;
  name: string;
  address: string;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo: string;
  audits: string;
  audit_note: string;
  gecko_id: string;
  cmcId: string;
  category: string;
  chains: string[];
  module: string;
  twitter: string;
  forkedFrom: string[];
  oracles: string[];
  listedAt: number;
  methodology: string;
  slug: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h: number;
  change_1d: number;
  change_7d: number;
  tokenBreakdowns: Record<string, unknown>;
  mcap: number;
}

export interface DefiLlamaHistoricalTVL {
  date: number;
  totalLiquidityUSD: number;
}

export interface DefiLlamaYield {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number | null;
  apy: number;
  rewardTokens: string[];
  pool: string;
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
}

// ─── Protocol lookup ──────────────────────────────────────────────────────────

let protocolCache: DefiLlamaProtocol[] | null = null;
let protocolCacheTime = 0;

export async function getAllProtocols(): Promise<DefiLlamaProtocol[]> {
  // Cache protocol list for 10 minutes
  if (protocolCache && Date.now() - protocolCacheTime < 600_000) return protocolCache;
  
  const result = await llamaGet<DefiLlamaProtocol[]>(`${BASE}/protocols`);
  if (result) {
    protocolCache = result;
    protocolCacheTime = Date.now();
  }
  return protocolCache ?? [];
}

export async function findProtocolByAddress(address: string): Promise<DefiLlamaProtocol | null> {
  const protocols = await getAllProtocols();
  const lower = address.toLowerCase();
  return protocols.find(p => p.address?.toLowerCase() === lower) ?? null;
}

export async function findProtocolByName(name: string): Promise<DefiLlamaProtocol | null> {
  const protocols = await getAllProtocols();
  const lower = name.toLowerCase();
  return (
    protocols.find(p => p.name.toLowerCase() === lower) ??
    protocols.find(p => p.slug.toLowerCase() === lower) ??
    protocols.find(p => p.name.toLowerCase().includes(lower)) ??
    null
  );
}

export async function getProtocolTVL(slug: string): Promise<DefiLlamaHistoricalTVL[]> {
  const result = await llamaGet<{ tvl: DefiLlamaHistoricalTVL[] }>(`${BASE}/protocol/${slug}`);
  return result?.tvl ?? [];
}

export async function getProtocolDetails(slug: string): Promise<Record<string, unknown> | null> {
  return llamaGet<Record<string, unknown>>(`${BASE}/protocol/${slug}`);
}

// ─── Yields / APY ────────────────────────────────────────────────────────────

export async function getYieldPools(chain?: string): Promise<DefiLlamaYield[]> {
  const result = await llamaGet<{ data: DefiLlamaYield[] }>('https://yields.llama.fi/pools');
  if (!result?.data) return [];
  if (chain) {
    const chainLower = chain.toLowerCase();
    return result.data.filter(p => p.chain.toLowerCase() === chainLower);
  }
  return result.data;
}

export async function getTopYieldPools(chain?: string, minTvl = 1_000_000, limit = 10): Promise<DefiLlamaYield[]> {
  const pools = await getYieldPools(chain);
  return pools
    .filter(p => p.tvlUsd >= minTvl && p.apy > 0 && !p.stablecoin)
    .sort((a, b) => b.apy - a.apy)
    .slice(0, limit);
}

// ─── Token Prices ─────────────────────────────────────────────────────────────

export async function getTokenPrice(
  address: string,
  chain: string,
): Promise<{ price: number; symbol: string; confidence: number } | null> {
  // DeFiLlama coins format: "ethereum:0x..."
  const chainMap: Record<string, string> = {
    ethereum: 'ethereum',
    base: 'base',
    xlayer: 'xlayer',
  };
  const llamaChain = chainMap[chain.toLowerCase()] || chain.toLowerCase();
  const coinId = `${llamaChain}:${address.toLowerCase()}`;

  const result = await llamaGet<{
    coins: Record<string, { price: number; symbol: string; confidence: number; decimals: number }>;
  }>(`${COINS_BASE}/prices/current/${coinId}`);

  const coin = result?.coins?.[coinId];
  return coin ?? null;
}

// ─── Protocol health ──────────────────────────────────────────────────────────

export interface ProtocolHealth {
  name: string;
  tvl: number;
  tvlChange1d: number;
  tvlChange7d: number;
  category: string;
  chains: string[];
  audited: boolean;
  auditCount: number;
  hasExploits: boolean;
  mcap: number;
  description: string;
}

export function assessProtocolHealth(protocol: DefiLlamaProtocol): ProtocolHealth {
  return {
    name: protocol.name,
    tvl: protocol.tvl ?? 0,
    tvlChange1d: protocol.change_1d ?? 0,
    tvlChange7d: protocol.change_7d ?? 0,
    category: protocol.category ?? 'Unknown',
    chains: protocol.chains ?? [],
    audited: parseInt(protocol.audits || '0') > 0,
    auditCount: parseInt(protocol.audits || '0'),
    hasExploits: false, // Would need additional data source for exploit history
    mcap: protocol.mcap ?? 0,
    description: protocol.description ?? '',
  };
}
