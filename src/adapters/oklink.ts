// src/adapters/oklink.ts
// OKLink API — block explorer for X Layer (and other OKX chains)
// Get API key: https://www.oklink.com/docs/en/#overview-guide
// Free tier: available after signup

import axios from 'axios';
import logger from '../lib/logger.js';

const BASE = 'https://www.oklink.com/api/v5/explorer';

async function oklinkGet<T>(endpoint: string, params?: Record<string, string>): Promise<T | null> {
  const key = process.env.OKLINK_API_KEY;
  if (!key) {
    logger.warn('[oklink] OKLINK_API_KEY not set — X Layer explorer calls will fail');
    return null;
  }

  try {
    const res = await axios.get<{ code: string; msg: string; data: T[] }>(`${BASE}${endpoint}`, {
      params,
      headers: { 'Ok-Access-Key': key },
      timeout: 10000,
    });
    if (res.data.code !== '0') {
      logger.warn('[oklink] API error', { code: res.data.code, msg: res.data.msg });
      return null;
    }
    return res.data.data?.[0] ?? null;
  } catch (err) {
    logger.warn('[oklink] Request failed', { endpoint, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

async function oklinkGetArray<T>(endpoint: string, params?: Record<string, string>): Promise<T[]> {
  const key = process.env.OKLINK_API_KEY;
  if (!key) return [];

  try {
    const res = await axios.get<{ code: string; msg: string; data: T[] }>(`${BASE}${endpoint}`, {
      params,
      headers: { 'Ok-Access-Key': key },
      timeout: 10000,
    });
    if (res.data.code !== '0') return [];
    return res.data.data ?? [];
  } catch {
    return [];
  }
}

// ─── Address Summary ──────────────────────────────────────────────────────

export interface OKLinkAddressSummary {
  chainFullName: string;
  chainShortName: string;
  address: string;
  contractAddress: string;
  balance: string;
  balanceSymbol: string;
  transactionCount: string;
  verifyStatus: string;
  receiveAmount: string;
  sendAmount: string;
  tokenAmount: string;
  totalTokenValue: string;
  createContractAddress: string;
  createContractTransactionHash: string;
  firstTransactionTime: string;
  lastTransactionTime: string;
  token: string;
  isAaAddress: boolean;
}

export async function getAddressSummary(address: string): Promise<OKLinkAddressSummary | null> {
  return oklinkGet<OKLinkAddressSummary>('/address/address-summary', {
    chainShortName: 'XLAYER',
    address,
  });
}

// ─── Transaction list ─────────────────────────────────────────────────────

export interface OKLinkTransaction {
  txId: string;
  methodId: string;
  blockHash: string;
  height: string;
  transactionTime: string;
  from: string;
  to: string;
  isFromContract: boolean;
  isToContract: boolean;
  amount: string;
  transactionSymbol: string;
  txFee: string;
  state: string;
  tokenId: string;
  tokenContractAddress: string;
  challengeStatus: string;
  l1OriginHash: string;
}

export async function getAddressTransactions(address: string, limit = 50): Promise<OKLinkTransaction[]> {
  const result = await oklinkGet<{ transactionLists: OKLinkTransaction[] }>(
    '/address/transaction-list',
    {
      chainShortName: 'XLAYER',
      address,
      limit: String(limit),
    },
  );
  return result?.transactionLists ?? [];
}

// ─── Token info ────────────────────────────────────────────────────────────

export interface OKLinkTokenInfo {
  chainFullName: string;
  chainShortName: string;
  tokenContractAddress: string;
  token: string;
  precision: string;
  totalSupply: string;
  circulatingSupply: string;
  issueTime: string;
  website: string;
  whitePaper: string;
  introduce: string;
  logo: string;
  positionChange: string;
  marketCap: string;
  price: string;
  priceChangeInDay: string;
  holderCount: string;
}

export async function getTokenInfo(address: string): Promise<OKLinkTokenInfo | null> {
  return oklinkGet<OKLinkTokenInfo>('/token/token-list', {
    chainShortName: 'XLAYER',
    tokenContractAddress: address,
  });
}

// ─── Transaction detail ────────────────────────────────────────────────────

export interface OKLinkTxDetail {
  chainFullName: string;
  chainShortName: string;
  txId: string;
  height: string;
  transactionTime: string;
  amount: string;
  transactionSymbol: string;
  txFee: string;
  state: string;
  from: string;
  to: string;
  isFromContract: boolean;
  isToContract: boolean;
  gasLimit: string;
  gasUsed: string;
  gasPrice: string;
  nonce: string;
  inputData: string;
  tokenTransferDetails: Array<{
    from: string;
    to: string;
    amount: string;
    token: string;
    tokenContractAddress: string;
  }>;
}

export async function getTransactionDetail(txHash: string): Promise<OKLinkTxDetail | null> {
  return oklinkGet<OKLinkTxDetail>('/transaction/transaction-fills', {
    chainShortName: 'XLAYER',
    txId: txHash,
  });
}

// ─── Token holders ────────────────────────────────────────────────────────

export interface OKLinkTokenHolder {
  address: string;
  valueUsd: string;
  amount: string;
  holdingRatio: string;
}

export async function getTokenHolders(address: string): Promise<OKLinkTokenHolder[]> {
  const result = await oklinkGet<{ positionList: OKLinkTokenHolder[] }>(
    '/token/position-list',
    {
      chainShortName: 'XLAYER',
      tokenContractAddress: address,
      limit: '20',
    },
  );
  return result?.positionList ?? [];
}
