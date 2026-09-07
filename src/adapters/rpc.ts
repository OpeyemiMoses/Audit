// src/adapters/rpc.ts
// Generic JSON-RPC adapter — works with any EVM-compatible chain.
// Used as a fallback / primary source for X Layer when OKLINK_API_KEY is not set.
// All public X Layer RPC endpoints support standard eth_* methods.

import axios from 'axios';
import logger from '../lib/logger.js';
import { ChainConfig } from '../types/chains.js';

// ─── Core JSON-RPC helper ─────────────────────────────────────────────────

async function rpcCall<T>(
  rpcUrl: string,
  method: string,
  params: unknown[] = [],
): Promise<T | null> {
  try {
    const res = await axios.post<{
      id: number;
      jsonrpc: string;
      result?: T;
      error?: { code: number; message: string };
    }>(
      rpcUrl,
      { id: 1, jsonrpc: '2.0', method, params },
      { timeout: 12000, headers: { 'Content-Type': 'application/json' } },
    );
    if (res.data.error) {
      logger.warn('[rpc] JSON-RPC error', { method, error: res.data.error.message });
      return null;
    }
    return res.data.result ?? null;
  } catch (err) {
    logger.warn('[rpc] Request failed', {
      method,
      url: rpcUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Balance ──────────────────────────────────────────────────────────────

/** Returns native token balance in wei (as BigInt) */
export async function getNativeBalance(address: string, config: ChainConfig): Promise<bigint> {
  const result = await rpcCall<string>(config.rpcUrl, 'eth_getBalance', [address, 'latest']);
  if (!result) return 0n;
  return BigInt(result);
}

/** Returns native token balance in decimal (e.g. ETH / OKB) */
export async function getNativeBalanceDecimal(address: string, config: ChainConfig): Promise<number> {
  const wei = await getNativeBalance(address, config);
  return Number(wei) / 1e18;
}

// ─── Contract detection ────────────────────────────────────────────────────

/** Returns true if address has deployed bytecode */
export async function isContract(address: string, config: ChainConfig): Promise<boolean> {
  const code = await rpcCall<string>(config.rpcUrl, 'eth_getCode', [address, 'latest']);
  return typeof code === 'string' && code !== '0x' && code.length > 2;
}

/** Returns raw bytecode at address */
export async function getBytecode(address: string, config: ChainConfig): Promise<string> {
  const code = await rpcCall<string>(config.rpcUrl, 'eth_getCode', [address, 'latest']);
  return code ?? '0x';
}

// ─── Transaction data ─────────────────────────────────────────────────────

export interface RpcTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gas: string;
  input: string;
  nonce: string;
  blockNumber: string;
  blockHash: string;
  transactionIndex: string;
}

export async function getTransaction(
  txHash: string,
  config: ChainConfig,
): Promise<RpcTransaction | null> {
  return rpcCall<RpcTransaction>(config.rpcUrl, 'eth_getTransactionByHash', [txHash]);
}

export interface RpcTransactionReceipt {
  transactionHash: string;
  from: string;
  to: string | null;
  status: string; // '0x1' = success, '0x0' = failed
  gasUsed: string;
  effectiveGasPrice: string;
  blockNumber: string;
  contractAddress: string | null;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
    logIndex: string;
  }>;
}

export async function getTransactionReceipt(
  txHash: string,
  config: ChainConfig,
): Promise<RpcTransactionReceipt | null> {
  return rpcCall<RpcTransactionReceipt>(config.rpcUrl, 'eth_getTransactionReceipt', [txHash]);
}

// ─── Block data ────────────────────────────────────────────────────────────

export async function getBlockNumber(config: ChainConfig): Promise<number> {
  const result = await rpcCall<string>(config.rpcUrl, 'eth_blockNumber', []);
  return result ? parseInt(result, 16) : 0;
}

export interface RpcBlock {
  number: string;
  hash: string;
  timestamp: string;
  gasLimit: string;
  gasUsed: string;
  miner: string;
  transactions: string[];
}

export async function getBlock(
  blockNumberHex: string,
  config: ChainConfig,
): Promise<RpcBlock | null> {
  return rpcCall<RpcBlock>(config.rpcUrl, 'eth_getBlockByNumber', [blockNumberHex, false]);
}

// ─── ERC-20 token calls (via eth_call ABI encoding) ───────────────────────
// These use manual ABI encoding to avoid adding ethers/viem as a dependency here.
// Function selectors: balanceOf=0x70a08231, decimals=0x313ce567, symbol=0x95d89b41, name=0x06fdde03

async function callContract(
  to: string,
  data: string,
  config: ChainConfig,
): Promise<string | null> {
  return rpcCall<string>(config.rpcUrl, 'eth_call', [{ to, data }, 'latest']);
}

function padAddress(address: string): string {
  return address.replace('0x', '').padStart(64, '0');
}

function hexToUtf8(hex: string): string {
  try {
    // Remove 0x prefix and the first 64 bytes (offset) and second 64 bytes (length)
    const data = hex.replace('0x', '');
    if (data.length < 128) return '';
    const len = parseInt(data.slice(64, 128), 16);
    const str = data.slice(128, 128 + len * 2);
    return Buffer.from(str, 'hex').toString('utf8').replace(/\0/g, '');
  } catch {
    return '';
  }
}

function hexToUint(hex: string): number {
  if (!hex || hex === '0x') return 0;
  return parseInt(hex.replace('0x', '').slice(-64), 16);
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

/** Read ERC-20 name, symbol, decimals via direct eth_call */
export async function getERC20Info(
  tokenAddress: string,
  config: ChainConfig,
): Promise<TokenInfo | null> {
  try {
    const [nameHex, symbolHex, decimalsHex] = await Promise.all([
      callContract(tokenAddress, '0x06fdde03', config),
      callContract(tokenAddress, '0x95d89b41', config),
      callContract(tokenAddress, '0x313ce567', config),
    ]);

    if (!nameHex && !symbolHex) return null;

    return {
      name: nameHex ? hexToUtf8(nameHex) : '',
      symbol: symbolHex ? hexToUtf8(symbolHex) : '',
      decimals: decimalsHex ? hexToUint(decimalsHex) : 18,
    };
  } catch {
    return null;
  }
}

/** Read ERC-20 balance for a wallet via direct eth_call */
export async function getERC20Balance(
  tokenAddress: string,
  walletAddress: string,
  config: ChainConfig,
): Promise<bigint> {
  const data = '0x70a08231' + padAddress(walletAddress);
  const result = await callContract(tokenAddress, data, config);
  if (!result || result === '0x') return 0n;
  try {
    return BigInt(result);
  } catch {
    return 0n;
  }
}

// ─── Gas price ─────────────────────────────────────────────────────────────

export async function getGasPrice(config: ChainConfig): Promise<bigint> {
  const result = await rpcCall<string>(config.rpcUrl, 'eth_gasPrice', []);
  if (!result) return 0n;
  return BigInt(result);
}

// ─── Transaction count (nonce) ────────────────────────────────────────────

export async function getTransactionCount(address: string, config: ChainConfig): Promise<number> {
  const result = await rpcCall<string>(config.rpcUrl, 'eth_getTransactionCount', [
    address,
    'latest',
  ]);
  return result ? parseInt(result, 16) : 0;
}
