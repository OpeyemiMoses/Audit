// src/adapters/goplus.ts
// GoPlus Security Labs API — token/contract/wallet security intelligence
// Free tier: ~10,000 calls/day. No key required for basic endpoints.
// Docs: https://docs.gopluslabs.io/reference/api-reference

import axios from 'axios';
import logger from '../lib/logger.js';

const GOPLUS_BASE = 'https://api.gopluslabs.io/api/v1';

async function goplusGet<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  try {
    const headers: Record<string, string> = {};
    const key = process.env.GOPLUS_API_KEY;
    if (key && !key.startsWith('your_')) {
      headers['App-Token'] = key;
    }

    const res = await axios.get<{ code: number; message: string; result: T }>(
      `${GOPLUS_BASE}${endpoint}`,
      { params, headers, timeout: 12000 },
    );

    if (res.data.code !== 1) {
      logger.warn('[goplus] Non-success code', { code: res.data.code, message: res.data.message });
      return null;
    }
    return res.data.result;
  } catch (err) {
    logger.warn('[goplus] Request failed', { endpoint, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ─── Token Security ───────────────────────────────────────────────────────────

export interface GoPlusTokenSecurity {
  token_name: string;
  token_symbol: string;
  total_supply: string;
  holder_count: string;
  creator_address: string;
  creator_balance: string;
  creator_percent: string;
  owner_address: string;
  owner_balance: string;
  owner_percent: string;
  lp_holder_count: string;
  lp_total_supply: string;
  is_open_source: string;         // "1" = yes
  is_proxy: string;
  is_mintable: string;
  is_honeypot: string;            // "1" = honeypot
  honeypot_with_same_creator: string;
  is_blacklisted: string;
  is_whitelisted: string;
  is_in_dex: string;
  is_anti_whale: string;
  is_airdrop_scam: string;
  trading_cooldown: string;
  can_take_back_ownership: string;
  hidden_owner: string;
  selfdestruct: string;
  external_call: string;
  cannot_sell_all: string;        // "1" = cannot sell
  cannot_buy: string;
  transfer_pausable: string;
  personal_slippage_modifiable: string;
  slippage_modifiable: string;
  buy_tax: string;                // percentage as string e.g. "0.05"
  sell_tax: string;
  holders: GoPlusHolder[];
  lp_holders: GoPlusHolder[];
  dex: GoPlusDex[];
}

export interface GoPlusHolder {
  address: string;
  tag: string;
  is_contract: string;
  balance: string;
  percent: string;
  is_locked: string;
}

export interface GoPlusDex {
  name: string;
  liquidity: string;
  pair: string;
}

export async function getTokenSecurity(
  address: string,
  chainId: string,
): Promise<GoPlusTokenSecurity | null> {
  const result = await goplusGet<Record<string, GoPlusTokenSecurity>>(
    `/token_security/${chainId}`,
    { contract_addresses: address.toLowerCase() },
  );
  if (!result) return null;
  const key = Object.keys(result)[0];
  return key ? result[key] : null;
}

// ─── Address Security (phishing / malicious wallets) ─────────────────────────

export interface GoPlusAddressSecurity {
  cybercrime: string;
  money_laundering: string;
  number_of_malicious_contracts_created: string;
  gas_abuse: string;
  financial_crime: string;
  darkweb_transactions: string;
  reinit: string;
  phishing_activities: string;
  fake_kyc: string;
  blackmail_activities: string;
  stealing_attack: string;
  blacklist_doubt: string;
  malicious_contracts_creation: string;
  sanctioned: string;
}

export async function getAddressSecurity(
  address: string,
): Promise<GoPlusAddressSecurity | null> {
  return goplusGet<GoPlusAddressSecurity>(`/address_security/${address}`, {});
}

// ─── Contract Security ────────────────────────────────────────────────────────

export async function getContractSecurity(
  address: string,
  chainId: string,
): Promise<GoPlusTokenSecurity | null> {
  // GoPlus uses the token_security endpoint for contract analysis too
  return getTokenSecurity(address, chainId);
}

// ─── Malicious Address Check ─────────────────────────────────────────────────

export interface MaliciousAddressResult {
  isMalicious: boolean;
  flags: string[];
  score: number; // 0-100 how bad
}

export function analyzeMaliciousAddress(
  security: GoPlusAddressSecurity | null,
): MaliciousAddressResult {
  if (!security) return { isMalicious: false, flags: [], score: 0 };

  const flags: string[] = [];
  let score = 0;

  if (security.cybercrime === '1') { flags.push('Cybercrime involvement'); score += 40; }
  if (security.money_laundering === '1') { flags.push('Money laundering activity'); score += 40; }
  if (security.phishing_activities === '1') { flags.push('Phishing activities'); score += 35; }
  if (security.sanctioned === '1') { flags.push('Sanctioned address (OFAC or similar)'); score += 50; }
  if (security.darkweb_transactions === '1') { flags.push('Dark web transactions'); score += 30; }
  if (security.financial_crime === '1') { flags.push('Financial crime'); score += 35; }
  if (security.stealing_attack === '1') { flags.push('Stealing attacks'); score += 30; }
  if (security.blackmail_activities === '1') { flags.push('Blackmail activities'); score += 25; }
  if (parseInt(security.number_of_malicious_contracts_created || '0') > 0) {
    flags.push(`Created ${security.number_of_malicious_contracts_created} malicious contracts`);
    score += 20;
  }

  return { isMalicious: flags.length > 0, flags, score: Math.min(100, score) };
}

// ─── Token Risk Scoring from GoPlus data ────────────────────────────────────

export interface TokenRiskAssessment {
  score: number;         // 0-100 risk
  flags: string[];
  isSafe: boolean;
  isHoneypot: boolean;
  liquidityRisk: number; // 0-100
}

export function assessTokenRisk(security: GoPlusTokenSecurity | null): TokenRiskAssessment {
  if (!security) return { score: 50, flags: ['Could not retrieve security data'], isSafe: false, isHoneypot: false, liquidityRisk: 50 };

  const flags: string[] = [];
  let score = 0;
  const isHoneypot = security.is_honeypot === '1';

  // Critical flags
  if (isHoneypot) { flags.push('HONEYPOT — tokens cannot be sold'); score += 50; }
  if (security.cannot_sell_all === '1') { flags.push('Cannot sell all tokens'); score += 30; }
  if (security.cannot_buy === '1') { flags.push('Cannot buy tokens'); score += 25; }
  if (security.hidden_owner === '1') { flags.push('Hidden owner (ownership can be re-taken)'); score += 20; }

  // High risk flags
  if (security.is_mintable === '1') { flags.push('Token is mintable (supply can increase)'); score += 10; }
  if (security.transfer_pausable === '1') { flags.push('Transfers can be paused by owner'); score += 15; }
  if (security.slippage_modifiable === '1') { flags.push('Slippage can be modified'); score += 15; }
  if (security.is_blacklisted === '1') { flags.push('Has blacklist function'); score += 10; }
  if (security.selfdestruct === '1') { flags.push('Contract can self-destruct'); score += 20; }
  if (security.external_call === '1') { flags.push('External call risk (reentrancy possible)'); score += 10; }

  // Tax analysis
  const buyTax = parseFloat(security.buy_tax || '0') * 100;
  const sellTax = parseFloat(security.sell_tax || '0') * 100;
  if (buyTax > 10) { flags.push(`High buy tax: ${buyTax.toFixed(1)}%`); score += 10; }
  if (sellTax > 10) { flags.push(`High sell tax: ${sellTax.toFixed(1)}%`); score += 10; }
  if (sellTax > 30) { flags.push(`Extreme sell tax: ${sellTax.toFixed(1)}%`); score += 20; }

  // Source code
  if (security.is_open_source !== '1') { flags.push('Source code not verified'); score += 10; }

  // Liquidity
  const totalLiquidity = (security.dex || []).reduce((sum, d) => sum + parseFloat(d.liquidity || '0'), 0);
  let liquidityRisk = 0;
  if (totalLiquidity === 0) { flags.push('No liquidity found on DEXes'); liquidityRisk = 90; score += 20; }
  else if (totalLiquidity < 10000) { flags.push(`Very low liquidity: $${totalLiquidity.toLocaleString()}`); liquidityRisk = 70; score += 10; }
  else if (totalLiquidity < 100000) { liquidityRisk = 40; }
  else { liquidityRisk = 10; }

  // Creator/owner concentration
  const creatorPct = parseFloat(security.creator_percent || '0') * 100;
  const ownerPct = parseFloat(security.owner_percent || '0') * 100;
  if (creatorPct > 50) { flags.push(`Creator holds ${creatorPct.toFixed(1)}% of supply`); score += 20; }
  else if (creatorPct > 20) { flags.push(`Creator holds ${creatorPct.toFixed(1)}% of supply`); score += 10; }
  if (ownerPct > 30 && security.owner_address !== '0x0000000000000000000000000000000000000000') {
    flags.push(`Owner holds ${ownerPct.toFixed(1)}% of supply`);
    score += 10;
  }

  const finalScore = Math.min(100, score);
  return {
    score: finalScore,
    flags,
    isSafe: finalScore < 30 && !isHoneypot,
    isHoneypot,
    liquidityRisk,
  };
}
