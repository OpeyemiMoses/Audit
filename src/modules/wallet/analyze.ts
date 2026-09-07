// src/modules/wallet/analyze.ts
import { z } from 'zod';
import { getChainConfig } from '../../types/chains.js';
import { buildResponse, Finding, Evidence, FindingSeverity } from '../../types/response.js';
import { getWalletTransactions, getEthBalance as getEtherscanBalance } from '../../adapters/etherscan.js';
import { getAddressSecurity, analyzeMaliciousAddress } from '../../adapters/goplus.js';
import { getEthBalance, isContract, weiToEth } from '../../adapters/alchemy.js';
import { getAddressSummary, getAddressTransactions as getOKLinkTxs } from '../../adapters/oklink.js';
import { classifyWalletBehavior } from '../../adapters/groq.js';
import cache from '../../lib/cache.js';
import logger from '../../lib/logger.js';

export const WalletAnalyzeSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid EVM wallet address'),
  chain: z.string().default('ethereum'),
});

export type WalletAnalyzeInput = z.infer<typeof WalletAnalyzeSchema>;

const KNOWN_MIXER_PATTERNS = [
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', // Tornado Cash router
  '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf',
  '0xa160cdab225685da1d56aa342ad8841c3b53f291',
];

export async function analyzeWallet(input: WalletAnalyzeInput) {
  const start = Date.now();
  const { address, chain } = input;
  const chainConfig = getChainConfig(chain);
  const cacheKey = cache.cacheKey('wallet', 'analyze', chain, address);

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  logger.info('[wallet/analyze] Starting', { address, chain });

  const dataSources: string[] = [];
  const findings: Finding[] = [];
  const recommendations: string[] = [];
  const evidence: Evidence[] = [];

  const isXLayer = chainConfig.explorerType === 'oklink';

  // ─── Fetch data in parallel ───────────────────────────────────────────────
  const [txList, goplusAddressSec, ethBalanceWei, contractCheck, oklinkSummary] = await Promise.all([
    !isXLayer ? getWalletTransactions(address, chainConfig, 1, 100) : Promise.resolve([]),
    getAddressSecurity(address),
    getEthBalance(address, chainConfig),
    isContract(address, chainConfig),
    isXLayer ? getAddressSummary(address) : Promise.resolve(null),
  ]);

  let oklinkTxs: Awaited<ReturnType<typeof getOKLinkTxs>> = [];
  if (isXLayer) {
    oklinkTxs = await getOKLinkTxs(address, 50);
    if (oklinkTxs.length > 0) dataSources.push('OKLink');
    if (oklinkSummary) dataSources.push('OKLink (Summary)');
  } else {
    if (txList.length > 0) dataSources.push('Etherscan');
  }
  if (goplusAddressSec) dataSources.push('GoPlus Security');
  dataSources.push('Alchemy (RPC)');

  // ─── Contract check ────────────────────────────────────────────────────────
  if (contractCheck) {
    findings.push({ id: 'is_contract', severity: 'info', title: 'Address is a smart contract, not an EOA wallet', description: 'This address contains deployed bytecode.', source: 'Alchemy' });
  }

  // ─── GoPlus malicious address check ──────────────────────────────────────
  const maliciousResult = analyzeMaliciousAddress(goplusAddressSec);
  for (const flag of maliciousResult.flags) {
    findings.push({ id: `malicious_${findings.length}`, severity: 'critical', title: flag, description: flag, source: 'GoPlus Security' });
  }

  // ─── ETH Balance ──────────────────────────────────────────────────────────
  const ethBalance = weiToEth(ethBalanceWei);
  const nativeCurrency = chainConfig.nativeCurrency;
  evidence.push({ label: `${nativeCurrency} balance`, value: `${ethBalance.toFixed(4)} ${nativeCurrency}`, source: 'Alchemy RPC' });

  // ─── Whale score ──────────────────────────────────────────────────────────
  let whaleScore = 0;
  if (ethBalance > 10000) whaleScore = 100;
  else if (ethBalance > 1000) whaleScore = 85;
  else if (ethBalance > 100) whaleScore = 60;
  else if (ethBalance > 10) whaleScore = 35;
  else if (ethBalance > 1) whaleScore = 15;
  evidence.push({ label: 'Whale score', value: whaleScore, source: 'ChainIntel' });

  // ─── Transaction analysis ─────────────────────────────────────────────────
  const txCount = txList.length > 0 ? txList.length : parseInt(oklinkSummary?.transactionCount || '0');
  const firstTx = txList.length > 0 ? txList[txList.length - 1] : null;
  const lastTx = txList.length > 0 ? txList[0] : null;

  let walletAgeDays = 0;
  let firstTxTimestamp = 0;
  if (firstTx?.timeStamp) {
    firstTxTimestamp = parseInt(firstTx.timeStamp) * 1000;
    walletAgeDays = Math.floor((Date.now() - firstTxTimestamp) / (1000 * 60 * 60 * 24));
  } else if (oklinkSummary?.firstTransactionTime) {
    firstTxTimestamp = parseInt(oklinkSummary.firstTransactionTime);
    walletAgeDays = Math.floor((Date.now() - firstTxTimestamp) / (1000 * 60 * 60 * 24));
  }

  evidence.push({ label: 'Transaction count', value: txCount, source: 'Etherscan / OKLink' });
  if (walletAgeDays > 0) {
    evidence.push({ label: 'Wallet age', value: `${walletAgeDays} days`, source: 'Etherscan / OKLink' });
  }

  // ─── Protocol usage ────────────────────────────────────────────────────────
  const KNOWN_PROTOCOLS: Record<string, string> = {
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
    '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router',
    '0x00000000219ab540356cbb839cbe05303d7705fa': 'ETH 2.0 Deposit',
    '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3',
    '0xc36442b4a4522e871399cd717abdd847ab11fe88': 'Uniswap V3 NFT Position',
  };

  const interactedProtocols = new Set<string>();
  for (const tx of txList) {
    const toAddr = tx.to?.toLowerCase();
    if (KNOWN_PROTOCOLS[toAddr]) interactedProtocols.add(KNOWN_PROTOCOLS[toAddr]);
  }

  // ─── Mixer interaction check ───────────────────────────────────────────────
  let hasMixerInteraction = false;
  for (const tx of txList) {
    if (KNOWN_MIXER_PATTERNS.includes(tx.to?.toLowerCase())) {
      hasMixerInteraction = true;
      findings.push({ id: 'mixer_interaction', severity: 'critical', title: 'Interaction with Tornado Cash or similar mixer', description: 'This wallet has sent funds to or received from a cryptocurrency mixer.', source: 'ChainIntel' });
      break;
    }
  }

  // ─── Activity pattern ─────────────────────────────────────────────────────
  let txFrequency = 0;
  if (walletAgeDays > 0 && txCount > 0) {
    txFrequency = txCount / walletAgeDays;
  }

  // ─── AI Classification ─────────────────────────────────────────────────────
  const classification = await classifyWalletBehavior({
    txCount,
    age_days: walletAgeDays,
    unique_protocols: interactedProtocols.size,
    has_mixer_interaction: hasMixerInteraction,
    avg_tx_value_eth: ethBalance,
    balance_eth: ethBalance,
  });

  if (classification.type !== 'unknown') dataSources.push('Groq AI');

  evidence.push({ label: 'Wallet type', value: classification.type.replace(/_/g, ' '), source: 'ChainIntel AI' });
  evidence.push({ label: 'Protocols used', value: interactedProtocols.size === 0 ? 'None detected' : Array.from(interactedProtocols).join(', '), source: 'ChainIntel' });

  // ─── Risk scoring ──────────────────────────────────────────────────────────
  let riskScore = 0;

  // Malicious signals dominate
  riskScore += maliciousResult.score;

  if (hasMixerInteraction) riskScore += 25;
  if (walletAgeDays < 7 && txCount > 20) { riskScore += 15; findings.push({ id: 'new_high_activity', severity: 'warning', title: 'Very new wallet with high activity — possible bot or suspicious', description: 'Wallet is less than 7 days old but has executed many transactions.', source: 'ChainIntel' }); }
  if (contractCheck) riskScore += 5; // Contracts aren't wallets per se — flag it
  if (walletAgeDays === 0 && txCount === 0) { riskScore += 20; findings.push({ id: 'no_history', severity: 'info', title: 'No transaction history found', description: 'This wallet has no on-chain history. May be new or an analysis error.', source: 'ChainIntel' }); }

  riskScore = Math.min(100, riskScore);

  // ─── Reputation score (inverse) ───────────────────────────────────────────
  const reputationScore = Math.max(0, 100 - riskScore);

  // ─── Recommendations ───────────────────────────────────────────────────────
  if (maliciousResult.isMalicious) recommendations.push('HIGH RISK — this address is flagged by security databases. Do not interact.');
  if (hasMixerInteraction) recommendations.push('This wallet has used privacy mixers. Exercise extreme caution in any financial interaction.');
  if (classification.botProbability > 0.7) recommendations.push('High bot probability detected — this may be an automated trading wallet.');
  if (walletAgeDays > 365 && interactedProtocols.size > 3) recommendations.push('Experienced DeFi user with multi-year track record and diverse protocol usage.');
  if (!maliciousResult.isMalicious && !hasMixerInteraction && riskScore < 30) recommendations.push('No major red flags detected. Normal due diligence still applies.');

  const confidence = Math.min(0.9, 0.3 + dataSources.length * 0.15);

  const summary = maliciousResult.isMalicious
    ? `🚨 FLAGGED WALLET — ${address.slice(0, 8)}... is marked malicious by security databases. Risk: ${riskScore}/100.`
    : `Wallet ${address.slice(0, 8)}... on ${chainConfig.name}: ${classification.type.replace(/_/g, ' ')} | ${txCount} txs | Age: ${walletAgeDays}d | Balance: ${ethBalance.toFixed(4)} ${nativeCurrency} | Risk: ${riskScore}/100`;

  const response = buildResponse(
    'wallet/analyze',
    chain,
    chainConfig.id,
    summary,
    riskScore,
    confidence,
    findings,
    recommendations,
    evidence,
    {
      address,
      is_contract: contractCheck,
      balance_native: parseFloat(ethBalance.toFixed(6)),
      native_currency: nativeCurrency,
      whale_score: whaleScore,
      reputation_score: reputationScore,
      transaction_count: txCount,
      wallet_age_days: walletAgeDays,
      first_tx_timestamp: firstTxTimestamp || null,
      wallet_type: classification.type,
      wallet_description: classification.description,
      bot_probability: classification.botProbability,
      protocols_used: Array.from(interactedProtocols),
      has_mixer_interaction: hasMixerInteraction,
      is_malicious: maliciousResult.isMalicious,
      malicious_flags: maliciousResult.flags,
      tx_frequency_per_day: parseFloat(txFrequency.toFixed(2)),
    },
    start,
    false,
    dataSources,
  );

  await cache.set(cacheKey, response, 300); // 5 min cache
  return response;
}
