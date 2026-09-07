// src/modules/protocol/analyze.ts
import { z } from 'zod';
import { getChainConfig } from '../../types/chains.js';
import { buildResponse, Finding, Evidence } from '../../types/response.js';
import {
  findProtocolByAddress,
  findProtocolByName,
  getProtocolDetails,
  assessProtocolHealth,
  getProtocolTVL,
} from '../../adapters/defillama.js';
import { getContractSource } from '../../adapters/etherscan.js';
import cache from '../../lib/cache.js';
import logger from '../../lib/logger.js';

export const ProtocolAnalyzeSchema = z.object({
  // Either a contract address or a protocol name (e.g. "uniswap", "aave")
  query: z.string().min(1, 'Provide a contract address or protocol name'),
  chain: z.string().default('ethereum'),
});

export type ProtocolAnalyzeInput = z.infer<typeof ProtocolAnalyzeSchema>;

const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);

export async function analyzeProtocol(input: ProtocolAnalyzeInput) {
  const start = Date.now();
  const { query, chain } = input;
  const chainConfig = getChainConfig(chain);
  const cacheKey = cache.cacheKey('protocol', 'analyze', chain, query);

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  logger.info('[protocol/analyze] Starting', { query, chain });

  const dataSources: string[] = ['DeFiLlama'];
  const findings: Finding[] = [];
  const recommendations: string[] = [];
  const evidence: Evidence[] = [];

  // ─── Protocol lookup ──────────────────────────────────────────────────────
  const protocol = isAddress(query)
    ? await findProtocolByAddress(query)
    : await findProtocolByName(query);

  if (!protocol) {
    // Try to get contract info even if not in DeFiLlama
    let contractName = '';
    if (isAddress(query) && chainConfig.explorerType !== 'oklink') {
      const src = await getContractSource(query, chainConfig).catch(() => null);
      contractName = src?.ContractName || '';
    }

    const response = buildResponse(
      'protocol/analyze', chain, chainConfig.id,
      `Protocol not found for "${query}" in the DeFiLlama database.${contractName ? ` Contract name: ${contractName}.` : ''} It may be too new, unlisted, or not a protocol.`,
      50, 0.3,
      [{ id: 'not_found', severity: 'warning', title: 'Protocol not found in DeFiLlama', description: 'This protocol is not tracked. It may be new, niche, or potentially unaudited.', source: 'DeFiLlama' }],
      ['Exercise caution with untracked protocols — check for audits and team doxxing manually'],
      [],
      { query, protocol: null, contract_name: contractName },
      start, false, ['DeFiLlama'],
    );
    return response;
  }

  // ─── Protocol details ─────────────────────────────────────────────────────
  const health = assessProtocolHealth(protocol);
  const historicalTVL = await getProtocolTVL(protocol.slug);

  evidence.push({ label: 'Protocol name', value: protocol.name, source: 'DeFiLlama' });
  evidence.push({ label: 'Category', value: protocol.category || 'Unknown', source: 'DeFiLlama' });
  evidence.push({ label: 'Current TVL', value: `$${health.tvl.toLocaleString()}`, source: 'DeFiLlama' });
  evidence.push({ label: 'TVL change (24h)', value: `${health.tvlChange1d.toFixed(2)}%`, source: 'DeFiLlama' });
  evidence.push({ label: 'TVL change (7d)', value: `${health.tvlChange7d.toFixed(2)}%`, source: 'DeFiLlama' });
  evidence.push({ label: 'Chains deployed', value: health.chains.join(', '), source: 'DeFiLlama' });
  evidence.push({ label: 'Audit count', value: health.auditCount, source: 'DeFiLlama' });
  evidence.push({ label: 'Market cap', value: health.mcap > 0 ? `$${health.mcap.toLocaleString()}` : 'N/A', source: 'DeFiLlama' });

  // ─── TVL trend analysis ───────────────────────────────────────────────────
  let tvlTrend = 'stable';
  const last30 = historicalTVL.slice(-30);
  if (last30.length >= 2) {
    const oldest = last30[0]?.totalLiquidityUSD ?? 0;
    const newest = last30[last30.length - 1]?.totalLiquidityUSD ?? 0;
    if (oldest > 0) {
      const change30d = ((newest - oldest) / oldest) * 100;
      tvlTrend = change30d > 20 ? 'growing' : change30d < -20 ? 'declining' : 'stable';
      evidence.push({ label: 'TVL trend (30d)', value: `${change30d.toFixed(1)}%`, source: 'DeFiLlama' });
    }
  }

  // ─── Risk scoring ──────────────────────────────────────────────────────────
  let riskScore = 0;

  // Audit checks
  if (!health.audited) {
    riskScore += 25;
    findings.push({ id: 'no_audits', severity: 'critical', title: 'No audits recorded', description: 'Protocol has no audit records in DeFiLlama. Unaudited protocols carry significantly higher smart contract risk.', source: 'DeFiLlama' });
    recommendations.push('No audits found — verify manually and exercise extreme caution');
  } else {
    evidence.push({ label: 'Audit status', value: `${health.auditCount} audit(s) recorded`, source: 'DeFiLlama' });
    if (health.auditCount >= 2) recommendations.push('Multiple audits on record — good security signal');
  }

  // TVL size (larger TVL = more battle-tested)
  if (health.tvl < 1_000_000) {
    riskScore += 20;
    findings.push({ id: 'low_tvl', severity: 'warning', title: `Low TVL: $${health.tvl.toLocaleString()}`, description: 'Low TVL protocols are less battle-tested and may have lower liquidity.', source: 'DeFiLlama' });
  } else if (health.tvl > 1_000_000_000) {
    evidence.push({ label: 'TVL tier', value: 'Top-tier protocol (>$1B TVL)', source: 'DeFiLlama' });
  }

  // Rapid TVL decline
  if (health.tvlChange1d < -10) {
    riskScore += 15;
    findings.push({ id: 'tvl_decline', severity: 'warning', title: `Rapid 24h TVL decline: ${health.tvlChange1d.toFixed(1)}%`, description: 'Sharp TVL drops can indicate user withdrawals, exploits, or loss of confidence.', source: 'DeFiLlama' });
    recommendations.push('Sharp TVL drop detected — monitor for exploit announcements and project news');
  }

  if (health.tvlChange7d < -30) {
    riskScore += 20;
    findings.push({ id: 'tvl_decline_7d', severity: 'critical', title: `Severe 7-day TVL decline: ${health.tvlChange7d.toFixed(1)}%`, description: 'This protocol has lost significant TVL over the past week.', source: 'DeFiLlama' });
  }

  // Forked protocol check
  if (protocol.forkedFrom && protocol.forkedFrom.length > 0) {
    evidence.push({ label: 'Forked from', value: protocol.forkedFrom.join(', '), source: 'DeFiLlama' });
    findings.push({ id: 'is_fork', severity: 'info', title: `Forked from: ${protocol.forkedFrom.join(', ')}`, description: 'This is a fork — inherit both the original protocol\'s strengths and potential unpatched vulnerabilities.', source: 'DeFiLlama' });
    riskScore += 5;
  }

  riskScore = Math.min(100, riskScore);

  // ─── Governance ────────────────────────────────────────────────────────────
  const hasGovernance = protocol.module?.includes('governance') ||
    protocol.description?.toLowerCase().includes('dao') ||
    protocol.description?.toLowerCase().includes('governance');

  if (hasGovernance) {
    evidence.push({ label: 'Governance', value: 'DAO / governance token detected', source: 'DeFiLlama' });
  }

  // ─── Recommendations ───────────────────────────────────────────────────────
  if (riskScore < 20 && health.tvl > 100_000_000) recommendations.push('Large, established protocol with low detected risk signals');
  if (tvlTrend === 'growing') recommendations.push('TVL is trending upward — protocol appears to be gaining user confidence');
  if (tvlTrend === 'declining') recommendations.push('TVL is declining — research root cause before committing funds');
  if (protocol.twitter) recommendations.push(`Monitor official Twitter: @${protocol.twitter} for security announcements`);

  const confidence = 0.75 + (health.audited ? 0.1 : 0) + (health.tvl > 1e8 ? 0.1 : 0);
  const summary = `${protocol.name} (${protocol.category}): $${health.tvl.toLocaleString()} TVL | ${health.auditCount} audit(s) | TVL trend: ${tvlTrend} | Chains: ${health.chains.slice(0, 3).join(', ')} | Risk: ${riskScore}/100`;

  const response = buildResponse(
    'protocol/analyze',
    chain,
    chainConfig.id,
    summary,
    riskScore,
    confidence,
    findings,
    recommendations,
    evidence,
    {
      name: protocol.name,
      slug: protocol.slug,
      category: protocol.category,
      description: health.description,
      tvl_usd: health.tvl,
      tvl_change_1d_pct: health.tvlChange1d,
      tvl_change_7d_pct: health.tvlChange7d,
      tvl_trend: tvlTrend,
      chains: health.chains,
      audit_count: health.auditCount,
      is_audited: health.audited,
      forked_from: protocol.forkedFrom || [],
      url: protocol.url,
      twitter: protocol.twitter,
      market_cap: health.mcap,
      has_governance: hasGovernance,
      historical_tvl_7d: historicalTVL.slice(-7),
    },
    start,
    false,
    dataSources,
  );

  await cache.set(cacheKey, response, 600);
  return response;
}
