// src/adapters/coingecko.ts
// CoinGecko API — token prices, market data, metadata
// Free tier works without a key (rate limited). Pro key optional.
// Docs: https://docs.coingecko.com/reference/introduction

import axios from 'axios';
import logger from '../lib/logger.js';

const BASE = 'https://api.coingecko.com/api/v3';

async function geckoGet<T>(endpoint: string, params?: Record<string, string>): Promise<T | null> {
  try {
    const headers: Record<string, string> = {};
    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }
    const res = await axios.get<T>(`${BASE}${endpoint}`, {
      params,
      headers,
      timeout: 10000,
    });
    return res.data;
  } catch (err) {
    logger.warn('[coingecko] Request failed', {
      endpoint,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Platform IDs ─────────────────────────────────────────────────────────

const PLATFORM_MAP: Record<string, string> = {
  ethereum: 'ethereum',
  base: 'base',
  xlayer: 'xlayer',
  '1': 'ethereum',
  '8453': 'base',
  '196': 'xlayer',
};

function getPlatformId(chain: string): string {
  return PLATFORM_MAP[chain.toLowerCase()] || chain.toLowerCase();
}

// ─── Token Data ────────────────────────────────────────────────────────────

export interface CoinGeckoTokenInfo {
  id: string;
  symbol: string;
  name: string;
  asset_platform_id: string;
  contract_address: string;
  market_cap_rank: number | null;
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    total_supply: number | null;
    circulating_supply: number | null;
    max_supply: number | null;
    ath: { usd: number };
    ath_change_percentage: { usd: number };
  };
  description: { en: string };
  links: {
    homepage: string[];
    twitter_screen_name: string;
    telegram_channel_identifier: string;
    repos_url: { github: string[] };
  };
}

export async function getTokenByContract(
  address: string,
  chain: string,
): Promise<CoinGeckoTokenInfo | null> {
  const platformId = getPlatformId(chain);
  return geckoGet<CoinGeckoTokenInfo>(
    `/coins/${platformId}/contract/${address.toLowerCase()}`,
  );
}

export async function getTokenPrice(
  address: string,
  chain: string,
): Promise<{ usd: number; usd_24h_change: number } | null> {
  const platformId = getPlatformId(chain);
  const result = await geckoGet<Record<string, { usd: number; usd_24h_change: number }>>(
    `/simple/token_price/${platformId}`,
    { contract_addresses: address.toLowerCase(), vs_currencies: 'usd', include_24hr_change: 'true' },
  );
  if (!result) return null;
  const key = Object.keys(result)[0];
  return key ? result[key] : null;
}

// ─── Market data summary ───────────────────────────────────────────────────

export interface MarketSummary {
  price_usd: number;
  market_cap_usd: number;
  volume_24h_usd: number;
  price_change_24h_pct: number;
  price_change_7d_pct: number;
  price_change_30d_pct: number;
  circulating_supply: number | null;
  max_supply: number | null;
  ath_usd: number;
  ath_change_pct: number;
  rank: number | null;
  symbol: string;
  name: string;
  description: string;
}

export function extractMarketSummary(info: CoinGeckoTokenInfo): MarketSummary {
  const md = info.market_data;
  return {
    price_usd: md?.current_price?.usd ?? 0,
    market_cap_usd: md?.market_cap?.usd ?? 0,
    volume_24h_usd: md?.total_volume?.usd ?? 0,
    price_change_24h_pct: md?.price_change_percentage_24h ?? 0,
    price_change_7d_pct: md?.price_change_percentage_7d ?? 0,
    price_change_30d_pct: md?.price_change_percentage_30d ?? 0,
    circulating_supply: md?.circulating_supply ?? null,
    max_supply: md?.max_supply ?? null,
    ath_usd: md?.ath?.usd ?? 0,
    ath_change_pct: md?.ath_change_percentage?.usd ?? 0,
    rank: info.market_cap_rank ?? null,
    symbol: info.symbol?.toUpperCase() ?? '',
    name: info.name ?? '',
    description: info.description?.en?.slice(0, 500) ?? '',
  };
}

// ─── Global market ─────────────────────────────────────────────────────────

export async function getGlobalMarketData(): Promise<{
  total_market_cap_usd: number;
  total_volume_usd: number;
  btc_dominance: number;
  market_cap_change_24h: number;
} | null> {
  const result = await geckoGet<{
    data: {
      total_market_cap: { usd: number };
      total_volume: { usd: number };
      market_cap_percentage: { btc: number };
      market_cap_change_percentage_24h_usd: number;
    };
  }>('/global');
  if (!result) return null;
  return {
    total_market_cap_usd: result.data.total_market_cap?.usd ?? 0,
    total_volume_usd: result.data.total_volume?.usd ?? 0,
    btc_dominance: result.data.market_cap_percentage?.btc ?? 0,
    market_cap_change_24h: result.data.market_cap_change_percentage_24h_usd ?? 0,
  };
}
