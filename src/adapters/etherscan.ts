// src/adapters/etherscan.ts
// Handles Etherscan-compatible APIs: Etherscan (ETH) + Basescan (Base)
// OKLink (X Layer) is handled separately in oklink.ts

import axios from 'axios';
import { ChainConfig } from '../types/chains.js';
import { DataSourceError, RateLimitError } from '../lib/errors.js';
import logger from '../lib/logger.js';

export interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  timeStamp: string;
  isError: string;
  input: string;
  contractAddress: string;
  functionName: string;
  methodId: string;
  blockNumber: string;
  confirmations: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
}

export interface ContractSource {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export interface EtherscanBalance {
  account: string;
  balance: string;
}

async function fetchEtherscan<T>(
  config: ChainConfig,
  params: Record<string, string>,
): Promise<T> {
  const url = config.explorerApi;
  const key = config.explorerApiKey;

  try {
    const res = await axios.get<{ status: string; message: string; result: T }>(url, {
      params: { ...params, apikey: key },
      timeout: 10000,
    });

    const data = res.data;
    if (data.message === 'NOTOK' && typeof data.result === 'string') {
      if (data.result.includes('Max rate limit')) throw new RateLimitError('etherscan');
      throw new DataSourceError('etherscan', data.result);
    }
    return data.result;
  } catch (err: unknown) {
    if (err instanceof RateLimitError || err instanceof DataSourceError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('[etherscan] Request failed', { url, params, error: msg });
    throw new DataSourceError('etherscan', msg);
  }
}

export async function getContractSource(
  address: string,
  config: ChainConfig,
): Promise<ContractSource | null> {
  try {
    const result = await fetchEtherscan<ContractSource[]>(config, {
      module: 'contract',
      action: 'getsourcecode',
      address,
    });
    return result?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function getContractABI(
  address: string,
  config: ChainConfig,
): Promise<string | null> {
  try {
    const result = await fetchEtherscan<string>(config, {
      module: 'contract',
      action: 'getabi',
      address,
    });
    // etherscan returns string "Contract source code not verified" when no ABI
    if (typeof result === 'string' && result.startsWith('{')) return result;
    if (typeof result === 'string' && result.startsWith('[')) return result;
    return null;
  } catch {
    return null;
  }
}

export async function getWalletTransactions(
  address: string,
  config: ChainConfig,
  page = 1,
  offset = 100,
): Promise<EtherscanTx[]> {
  try {
    const result = await fetchEtherscan<EtherscanTx[]>(config, {
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: String(page),
      offset: String(offset),
      sort: 'desc',
    });
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function getInternalTransactions(
  address: string,
  config: ChainConfig,
): Promise<EtherscanTx[]> {
  try {
    const result = await fetchEtherscan<EtherscanTx[]>(config, {
      module: 'account',
      action: 'txlistinternal',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: '50',
      sort: 'desc',
    });
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function getERC20Transfers(
  address: string,
  config: ChainConfig,
  contractAddress?: string,
): Promise<EtherscanTx[]> {
  try {
    const params: Record<string, string> = {
      module: 'account',
      action: 'tokentx',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: '100',
      sort: 'desc',
    };
    if (contractAddress) params.contractaddress = contractAddress;
    const result = await fetchEtherscan<EtherscanTx[]>(config, params);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function getEthBalance(
  address: string,
  config: ChainConfig,
): Promise<string> {
  try {
    const result = await fetchEtherscan<string>(config, {
      module: 'account',
      action: 'balance',
      address,
      tag: 'latest',
    });
    return result ?? '0';
  } catch {
    return '0';
  }
}

export async function getContractCreation(
  address: string,
  config: ChainConfig,
): Promise<{ contractCreator: string; txHash: string } | null> {
  try {
    const result = await fetchEtherscan<Array<{ contractCreator: string; txHash: string }>>(config, {
      module: 'contract',
      action: 'getcontractcreation',
      contractaddresses: address,
    });
    return result?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function isContract(
  address: string,
  config: ChainConfig,
): Promise<boolean> {
  try {
    const bytecode = await fetchEtherscan<string>(config, {
      module: 'proxy',
      action: 'eth_getCode',
      address,
      tag: 'latest',
    });
    return typeof bytecode === 'string' && bytecode !== '0x' && bytecode.length > 2;
  } catch {
    return false;
  }
}

export async function getTokenInfo(
  address: string,
  config: ChainConfig,
): Promise<{ name: string; symbol: string; totalSupply: string; decimals: string } | null> {
  try {
    const supply = await fetchEtherscan<string>(config, {
      module: 'stats',
      action: 'tokensupply',
      contractaddress: address,
    });
    return supply ? { name: '', symbol: '', totalSupply: supply, decimals: '18' } : null;
  } catch {
    return null;
  }
}

export async function getTransactionByHash(
  txHash: string,
  config: ChainConfig,
): Promise<EtherscanTx | null> {
  try {
    const result = await fetchEtherscan<EtherscanTx>(config, {
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: txHash,
    });
    return result ?? null;
  } catch {
    return null;
  }
}

export async function getTransactionReceipt(
  txHash: string,
  config: ChainConfig,
): Promise<Record<string, unknown> | null> {
  try {
    const result = await fetchEtherscan<Record<string, unknown>>(config, {
      module: 'proxy',
      action: 'eth_getTransactionReceipt',
      txhash: txHash,
    });
    return result ?? null;
  } catch {
    return null;
  }
}
