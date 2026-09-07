// src/adapters/alchemy.ts
// Alchemy API — RPC, token metadata, transaction simulation
// Get free key: https://www.alchemy.com → Create App → Ethereum
// Free tier: 300M compute units/month (more than enough for hackathon)

import axios from 'axios';
import logger from '../lib/logger.js';
import { ChainConfig } from '../types/chains.js';

async function alchemyPost<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
): Promise<T | null> {
  try {
    const res = await axios.post<{ id: number; jsonrpc: string; result?: T; error?: { message: string } }>(
      rpcUrl,
      { id: 1, jsonrpc: '2.0', method, params },
      { timeout: 12000, headers: { 'Content-Type': 'application/json' } },
    );
    if (res.data.error) {
      logger.warn('[alchemy] RPC error', { method, error: res.data.error.message });
      return null;
    }
    return res.data.result ?? null;
  } catch (err) {
    logger.warn('[alchemy] Request failed', { method, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ─── Token Metadata ────────────────────────────────────────────────────────

export interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
  totalSupply: string | null;
}

export async function getTokenMetadata(
  address: string,
  config: ChainConfig,
): Promise<AlchemyTokenMetadata | null> {
  // alchemy_getTokenMetadata is Alchemy-specific, only works on Alchemy nodes
  if (!config.rpcUrl.includes('alchemy.com')) return null;
  return alchemyPost<AlchemyTokenMetadata>(config.rpcUrl, 'alchemy_getTokenMetadata', [address]);
}

// ─── Token Balances ────────────────────────────────────────────────────────

export interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error: string | null;
}

export async function getWalletTokenBalances(
  address: string,
  config: ChainConfig,
): Promise<AlchemyTokenBalance[]> {
  if (!config.rpcUrl.includes('alchemy.com')) return [];
  const result = await alchemyPost<{ tokenBalances: AlchemyTokenBalance[] }>(
    config.rpcUrl,
    'alchemy_getTokenBalances',
    [address, 'erc20'],
  );
  return result?.tokenBalances ?? [];
}

// ─── ETH Balance ──────────────────────────────────────────────────────────

export async function getEthBalance(
  address: string,
  config: ChainConfig,
): Promise<bigint> {
  const result = await alchemyPost<string>(config.rpcUrl, 'eth_getBalance', [address, 'latest']);
  if (!result) return 0n;
  return BigInt(result);
}

// ─── Bytecode (is contract check) ─────────────────────────────────────────

export async function getCode(
  address: string,
  config: ChainConfig,
): Promise<string> {
  const result = await alchemyPost<string>(config.rpcUrl, 'eth_getCode', [address, 'latest']);
  return result ?? '0x';
}

export async function isContract(
  address: string,
  config: ChainConfig,
): Promise<boolean> {
  const code = await getCode(address, config);
  return code !== '0x' && code.length > 2;
}

// ─── Transaction Simulation ────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  gasUsed: string;
  error?: string;
  logs: Array<{ address: string; topics: string[]; data: string }>;
  returnData?: string;
}

export async function simulateTransaction(
  tx: {
    from?: string;
    to: string;
    data?: string;
    value?: string;
    gas?: string;
  },
  config: ChainConfig,
): Promise<SimulationResult> {
  // Try eth_call first (available on all nodes)
  try {
    const callResult = await alchemyPost<string>(config.rpcUrl, 'eth_call', [
      {
        from: tx.from || '0x0000000000000000000000000000000000000000',
        to: tx.to,
        data: tx.data || '0x',
        value: tx.value || '0x0',
      },
      'latest',
    ]);

    // Estimate gas
    const gasEstimate = await alchemyPost<string>(config.rpcUrl, 'eth_estimateGas', [
      {
        from: tx.from || '0x0000000000000000000000000000000000000000',
        to: tx.to,
        data: tx.data || '0x',
        value: tx.value || '0x0',
      },
    ]);

    return {
      success: callResult !== null,
      gasUsed: gasEstimate || '0x0',
      returnData: callResult || undefined,
      logs: [],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      gasUsed: '0x0',
      error: msg,
      logs: [],
    };
  }
}

// ─── Block data ───────────────────────────────────────────────────────────

export async function getBlockNumber(config: ChainConfig): Promise<number> {
  const result = await alchemyPost<string>(config.rpcUrl, 'eth_blockNumber', []);
  return result ? parseInt(result, 16) : 0;
}

export async function getTransaction(
  txHash: string,
  config: ChainConfig,
): Promise<Record<string, unknown> | null> {
  return alchemyPost<Record<string, unknown>>(config.rpcUrl, 'eth_getTransactionByHash', [txHash]);
}

export async function getTransactionReceipt(
  txHash: string,
  config: ChainConfig,
): Promise<Record<string, unknown> | null> {
  return alchemyPost<Record<string, unknown>>(config.rpcUrl, 'eth_getTransactionReceipt', [txHash]);
}

// ─── Format helpers ────────────────────────────────────────────────────────

export function weiToEth(wei: bigint): number {
  return Number(wei) / 1e18;
}

export function hexToDecimal(hex: string): number {
  return parseInt(hex, 16);
}
