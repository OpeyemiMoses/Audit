// src/adapters/binance.ts
// Binance Market Intelligence & Futures Funding Rate Adapter

import axios from 'axios';
import logger from '../lib/logger.js';

const SPOT_BASE_URLS = [
  'https://data-api.binance.vision',
  'https://api.binance.com',
  'https://api1.binance.com',
];
const FUTURES_BASE_URL = 'https://fapi.binance.com';

export interface Binance24hrTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  count: number;
}

export interface BinanceOrderBook {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
  spread: number;
  spreadPercent: number;
  bidDepthUSD: number;
  askDepthUSD: number;
  imbalance: number;
}

export interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
  annualizedRatePercent: number;
  sentiment: 'bullish_heavy' | 'bearish_heavy' | 'neutral';
}

export interface BinanceMarketAlpha {
  symbol: string;
  lastPrice: number;
  priceChange24hPercent: number;
  high24h: number;
  low24h: number;
  volume24hUSD: number;
  orderBook: {
    spreadPercent: number;
    bidDepthUSD: number;
    askDepthUSD: number;
    depthImbalance: string;
  };
  fundingRate?: BinanceFundingRate;
  marketRegime: 'high_volatility' | 'neutral' | 'trending_up' | 'trending_down';
  timestamp: string;
}

export class BinanceAdapter {
  async get24hrTicker(symbol: string = 'BNBUSDT'): Promise<Binance24hrTicker | null> {
    const cleanSymbol = symbol.toUpperCase().replace(/[-_/]/g, '');
    for (const baseUrl of SPOT_BASE_URLS) {
      try {
        const res = await axios.get(`${baseUrl}/api/v3/ticker/24hr`, {
          params: { symbol: cleanSymbol },
          timeout: 4000,
        });
        if (res.data && res.data.lastPrice) return res.data;
      } catch (err: any) {
        // try next endpoint
      }
    }
    logger.warn(`Binance 24hr ticker error for ${symbol}`);
    return null;
  }

  async getOrderBook(symbol: string = 'BNBUSDT', limit: number = 20): Promise<BinanceOrderBook | null> {
    const cleanSymbol = symbol.toUpperCase().replace(/[-_/]/g, '');
    for (const baseUrl of SPOT_BASE_URLS) {
      try {
        const res = await axios.get(`${baseUrl}/api/v3/depth`, {
          params: { symbol: cleanSymbol, limit },
          timeout: 4000,
        });

        const bids: [string, string][] = res.data.bids || [];
        const asks: [string, string][] = res.data.asks || [];

        const bestBid = bids.length > 0 ? parseFloat(bids[0][0]) : 0;
        const bestAsk = asks.length > 0 ? parseFloat(asks[0][0]) : 0;
        const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
        const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

        const bidDepthUSD = bids.reduce((acc, [price, qty]) => acc + parseFloat(price) * parseFloat(qty), 0);
        const askDepthUSD = asks.reduce((acc, [price, qty]) => acc + parseFloat(price) * parseFloat(qty), 0);
        const totalDepth = bidDepthUSD + askDepthUSD;
        const imbalance = totalDepth > 0 ? (bidDepthUSD - askDepthUSD) / totalDepth : 0;

        return {
          lastUpdateId: res.data.lastUpdateId,
          bids,
          asks,
          spread,
          spreadPercent,
          bidDepthUSD,
          askDepthUSD,
          imbalance,
        };
      } catch (err: any) {
        // try next endpoint
      }
    }
    return null;
  }

  async getFundingRate(symbol: string = 'BNBUSDT'): Promise<BinanceFundingRate | null> {
    try {
      const cleanSymbol = symbol.toUpperCase().replace(/[-_/]/g, '');
      const res = await axios.get(`${FUTURES_BASE_URL}/fapi/v1/fundingRate`, {
        params: { symbol: cleanSymbol, limit: 1 },
        timeout: 4000,
      });

      if (Array.isArray(res.data) && res.data.length > 0) {
        const item = res.data[0];
        const rate = parseFloat(item.fundingRate);
        const annualizedRatePercent = rate * 3 * 365 * 100;
        let sentiment: 'bullish_heavy' | 'bearish_heavy' | 'neutral' = 'neutral';
        if (rate > 0.0003) sentiment = 'bullish_heavy';
        else if (rate < -0.0001) sentiment = 'bearish_heavy';

        return {
          symbol: item.symbol,
          fundingRate: item.fundingRate,
          fundingTime: item.fundingTime,
          annualizedRatePercent,
          sentiment,
        };
      }
      return null;
    } catch (err: any) {
      return null;
    }
  }

  async getMarketAlpha(symbol: string = 'BNBUSDT'): Promise<BinanceMarketAlpha | null> {
    const cleanSymbol = symbol.toUpperCase().replace(/[-_/]/g, '');
    const [ticker, depth, funding] = await Promise.all([
      this.get24hrTicker(cleanSymbol),
      this.getOrderBook(cleanSymbol, 20),
      this.getFundingRate(cleanSymbol),
    ]);

    if (!ticker) return null;

    const lastPrice = parseFloat(ticker.lastPrice);
    const priceChange24hPercent = parseFloat(ticker.priceChangePercent);
    const high24h = parseFloat(ticker.highPrice);
    const low24h = parseFloat(ticker.lowPrice);
    const volume24hUSD = parseFloat(ticker.quoteVolume);

    let marketRegime: 'high_volatility' | 'neutral' | 'trending_up' | 'trending_down' = 'neutral';
    if (Math.abs(priceChange24hPercent) > 7) {
      marketRegime = 'high_volatility';
    } else if (priceChange24hPercent > 2.5) {
      marketRegime = 'trending_up';
    } else if (priceChange24hPercent < -2.5) {
      marketRegime = 'trending_down';
    }

    let depthImbalance = 'Neutral';
    if (depth) {
      if (depth.imbalance > 0.2) depthImbalance = 'Heavy Bid Pressure (Buyers Dominating)';
      else if (depth.imbalance < -0.2) depthImbalance = 'Heavy Ask Pressure (Sellers Dominating)';
    }

    return {
      symbol: cleanSymbol,
      lastPrice,
      priceChange24hPercent,
      high24h,
      low24h,
      volume24hUSD,
      orderBook: {
        spreadPercent: depth?.spreadPercent || 0,
        bidDepthUSD: depth?.bidDepthUSD || 0,
        askDepthUSD: depth?.askDepthUSD || 0,
        depthImbalance,
      },
      fundingRate: funding || undefined,
      marketRegime,
      timestamp: new Date().toISOString(),
    };
  }
}

export const binanceAdapter = new BinanceAdapter();
