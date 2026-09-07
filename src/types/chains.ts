// src/types/chains.ts
// Supported chains + all configuration per chain for Binance Agent OS & EVM ecosystems

export type SupportedChain = 'bsc' | 'opbnb' | 'bsc_testnet' | 'ethereum' | 'base' | 'arbitrum' | 'polygon';

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerApi: string;
  explorerApiKey: string;
  explorerType: 'etherscan' | 'bscscan' | 'oklink';
  goplusChainId: string;
  coingeckoPlatform: string;
  nativeCurrency: string;
  blockTime: number; // seconds
}

export const CHAIN_CONFIG: Record<SupportedChain, ChainConfig> = {
  bsc: {
    id: 56,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    rpcUrl: process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org',
    explorerApi: 'https://api.etherscan.io/v2/api?chainid=56',
    explorerApiKey: process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || '',
    explorerType: 'bscscan',
    goplusChainId: '56',
    coingeckoPlatform: 'binance-smart-chain',
    nativeCurrency: 'BNB',
    blockTime: 3,
  },
  opbnb: {
    id: 204,
    name: 'opBNB Mainnet',
    shortName: 'opBNB',
    rpcUrl: process.env.OPBNB_RPC_URL || 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorerApi: 'https://api.etherscan.io/v2/api?chainid=204',
    explorerApiKey: process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || '',
    explorerType: 'bscscan',
    goplusChainId: '204',
    coingeckoPlatform: 'opbnb',
    nativeCurrency: 'BNB',
    blockTime: 1,
  },
  bsc_testnet: {
    id: 97,
    name: 'BNB Smart Chain Testnet',
    shortName: 'BSC_TEST',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerApi: 'https://api.etherscan.io/v2/api?chainid=97',
    explorerApiKey: process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || '',
    explorerType: 'bscscan',
    goplusChainId: '97',
    coingeckoPlatform: 'binance-smart-chain',
    nativeCurrency: 'tBNB',
    blockTime: 3,
  },
  ethereum: {
    id: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    rpcUrl: process.env.ALCHEMY_RPC_ETH || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || 'demo'}`,
    explorerApi: 'https://api.etherscan.io/v2/api?chainid=1',
    explorerApiKey: process.env.ETHERSCAN_API_KEY || '',
    explorerType: 'etherscan',
    goplusChainId: '1',
    coingeckoPlatform: 'ethereum',
    nativeCurrency: 'ETH',
    blockTime: 12,
  },
  base: {
    id: 8453,
    name: 'Base',
    shortName: 'BASE',
    rpcUrl: process.env.ALCHEMY_RPC_BASE || `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || 'demo'}`,
    explorerApi: 'https://api.etherscan.io/v2/api?chainid=8453',
    explorerApiKey: process.env.ETHERSCAN_API_KEY || '',
    explorerType: 'etherscan',
    goplusChainId: '8453',
    coingeckoPlatform: 'base',
    nativeCurrency: 'ETH',
    blockTime: 2,
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    rpcUrl: process.env.ALCHEMY_RPC_ARB || 'https://arb1.arbitrum.io/rpc',
    explorerApi: 'https://api.etherscan.io/v2/api?chainid=42161',
    explorerApiKey: process.env.ETHERSCAN_API_KEY || '',
    explorerType: 'etherscan',
    goplusChainId: '42161',
    coingeckoPlatform: 'arbitrum-one',
    nativeCurrency: 'ETH',
    blockTime: 0.25,
  },
  polygon: {
    id: 137,
    name: 'Polygon PoS',
    shortName: 'POL',
    rpcUrl: process.env.ALCHEMY_RPC_POL || 'https://polygon-rpc.com',
    explorerApi: 'https://api.etherscan.io/v2/api?chainid=137',
    explorerApiKey: process.env.ETHERSCAN_API_KEY || '',
    explorerType: 'etherscan',
    goplusChainId: '137',
    coingeckoPlatform: 'polygon-pos',
    nativeCurrency: 'POL',
    blockTime: 2,
  },
};

export function getChainConfig(chain?: string): ChainConfig {
  if (!chain) return CHAIN_CONFIG.bsc;
  const key = normalizeChain(chain);
  const config = CHAIN_CONFIG[key];
  if (!config) return CHAIN_CONFIG.bsc;
  return config;
}

export function normalizeChain(chain?: string): SupportedChain {
  if (!chain) return 'bsc';
  const map: Record<string, SupportedChain> = {
    bsc: 'bsc',
    bnb: 'bsc',
    'bnb-chain': 'bsc',
    'bnb chain': 'bsc',
    binance: 'bsc',
    '56': 'bsc',
    opbnb: 'opbnb',
    '204': 'opbnb',
    'bsc-testnet': 'bsc_testnet',
    bsctest: 'bsc_testnet',
    '97': 'bsc_testnet',
    ethereum: 'ethereum',
    eth: 'ethereum',
    '1': 'ethereum',
    base: 'base',
    '8453': 'base',
    arbitrum: 'arbitrum',
    arb: 'arbitrum',
    '42161': 'arbitrum',
    polygon: 'polygon',
    matic: 'polygon',
    '137': 'polygon',
  };
  const normalized = map[chain.toLowerCase().trim()];
  if (!normalized) return 'bsc';
  return normalized;
}

export const SUPPORTED_CHAINS: SupportedChain[] = [
  'bsc',
  'opbnb',
  'bsc_testnet',
  'ethereum',
  'base',
  'arbitrum',
  'polygon',
];
