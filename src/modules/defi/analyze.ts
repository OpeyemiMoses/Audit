// src/modules/defi/analyze.ts
import { z } from 'zod';
import { getChainConfig } from '../../types/chains.js';
import { buildResponse, Finding, Evidence } from '../../types/response.js';
import { getTopYieldPools, getYieldPools } from '../../adapters/defillama.js';
import { getTokenByContract, extractMarketSummary } from '../../adapters/coingecko.js';
import { getTokenSecurity } from '../../adapters/goplus.js';
import cache from '../../lib/cache.js';
import logger from '../../lib/logger.js';

export const DeFiAnalyzeSchema = z.object({
  // Can be: a wallet address (to analyze DeFi positions), 
  // a pool address, or a token pair for yield comparison
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  token: z.string().optional(),
  chain: z.string().default('ethereum'),
  mode: z.enum(['yield', 'risk', 'position']).default('yield'),
});

export type DeFiAnalyzeInput = z.infer<typeof DeFiAnalyzeSchema>;

// Calculate impermanent loss for a 50/50 LP position
function calculateImpermanentLoss(priceRatioChange: number): number {
  // price_ratio_change = current_price / entry_price
  const r = priceRatioChange;
  if (r <= 0) return 100;
  const il = (2 * Math.sqrt(r) / (1 + r) - 1) * 100; // negative = loss
  return Math.abs(il);
}

export async function analyzeDeFi(input: DeFiAnalyzeInput) {
  const start = Date.now();
  const { chain, mode, address, token } = input;
  const chainConfig = getChainConfig(chain);
  const cacheKey = cache.cacheKey('defi', mode, chain, address || token || 'general');

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  logger.info('[defi/analyze] Starting', { chain, mode, address });

  const dataSources: string[] = ['DeFiLlama'];
  const findings: Finding[] = [];
  const recommendations: string[] = [];
  const evidence: Evidence[] = [];

  if (mode === 'yield') {
    // ─── Yield optimization analysis ────────────────────────────────────────
    const chainMap: Record<string, string> = {
      ethereum: 'Ethereum',
      base: 'Base',
      xlayer: 'X Layer',
    };
    const llamaChain = chainMap[chain.toLowerCase()] || 'Ethereum';

    const [topPools, chainPools] = await Promise.all([
      getTopYieldPools(llamaChain, 500_000, 15),
      getYieldPools(llamaChain),
    ]);

    // Stable pools
    const stablePools = chainPools
      .filter(p => p.stablecoin && p.tvlUsd >= 1_000_000 && p.apy > 0)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 5);

    // High yield pools
    const highYield = chainPools
      .filter(p => !p.stablecoin && p.tvlUsd >= 100_000 && p.apy > 20)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 5);

    evidence.push({ label: 'Pools analyzed', value: chainPools.length, source: 'DeFiLlama' });
    evidence.push({ label: 'Top APY available', value: topPools[0] ? `${topPools[0].apy.toFixed(2)}% (${topPools[0].project})` : 'N/A', source: 'DeFiLlama' });

    // Risk warnings
    for (const pool of highYield) {
      if (pool.apy > 100) {
        findings.push({ id: `high_apy_${pool.pool.slice(0, 8)}`, severity: 'warning', title: `Extremely high APY: ${pool.apy.toFixed(0)}% on ${pool.project}`, description: 'APYs >100% are usually unsustainable and carry high smart contract/rug risk.', source: 'DeFiLlama' });
      }
    }

    if (stablePools.length === 0) {
      findings.push({ id: 'no_stable_pools', severity: 'info', title: 'No high-liquidity stablecoin pools found on this chain', description: 'Consider Ethereum mainnet for more stablecoin yield options.', source: 'DeFiLlama' });
    }

    recommendations.push('For lower risk: choose stablecoin pools from audited protocols with >$10M TVL');
    recommendations.push('For higher yield: accept higher IL and protocol risk in volatile token pools');
    recommendations.push('Always check if the reward APY is sustainable or just temporary incentives');
    if (highYield.some(p => p.apy > 200)) recommendations.push('🚨 APYs >200% are almost always unsustainable — treat as high-risk speculation');

    const riskScore = highYield.some(p => p.apy > 200) ? 55 : 25;
    const summary = `DeFi yield analysis on ${chainConfig.name}: ${topPools.length} top pools found. Best stablecoin yield: ${stablePools[0] ? stablePools[0].apy.toFixed(2) + '% (' + stablePools[0].project + ')' : 'N/A'}. Best overall: ${topPools[0] ? topPools[0].apy.toFixed(2) + '% (' + topPools[0].project + ')' : 'N/A'}.`;

    const response = buildResponse(
      'defi/yield', chain, chainConfig.id, summary, riskScore, 0.8,
      findings, recommendations, evidence,
      {
        chain,
        mode: 'yield',
        top_pools: topPools.slice(0, 10).map(p => ({
          project: p.project,
          symbol: p.symbol,
          apy: parseFloat(p.apy.toFixed(2)),
          tvl_usd: Math.round(p.tvlUsd),
          il_risk: p.ilRisk,
          pool_id: p.pool,
          reward_tokens: p.rewardTokens,
        })),
        stable_pools: stablePools.map(p => ({
          project: p.project,
          symbol: p.symbol,
          apy: parseFloat(p.apy.toFixed(2)),
          tvl_usd: Math.round(p.tvlUsd),
          pool_id: p.pool,
        })),
        high_yield_pools: highYield.map(p => ({
          project: p.project,
          symbol: p.symbol,
          apy: parseFloat(p.apy.toFixed(2)),
          tvl_usd: Math.round(p.tvlUsd),
          pool_id: p.pool,
        })),
      },
      start, false, dataSources,
    );

    await cache.set(cacheKey, response, 300);
    return response;
  }

  // ─── Token DeFi risk analysis ─────────────────────────────────────────────
  if (mode === 'risk' && address) {
    const [goplusSec, cgInfo] = await Promise.all([
      getTokenSecurity(address, chainConfig.goplusChainId),
      getTokenByContract(address, chain).catch(() => null),
    ]);

    if (goplusSec) dataSources.push('GoPlus Security');
    if (cgInfo) dataSources.push('CoinGecko');

    const marketData = cgInfo ? extractMarketSummary(cgInfo) : null;

    // Liquidity risk from GoPlus
    const dexes = goplusSec?.dex || [];
    const totalLiquidity = dexes.reduce((sum, d) => sum + parseFloat(d.liquidity || '0'), 0);

    // Price volatility risk
    let volatilityRisk = 30;
    if (marketData) {
      const vol = Math.abs(marketData.price_change_24h_pct);
      if (vol > 30) volatilityRisk = 80;
      else if (vol > 15) volatilityRisk = 60;
      else if (vol > 5) volatilityRisk = 40;
      evidence.push({ label: '24h volatility', value: `${Math.abs(marketData.price_change_24h_pct).toFixed(2)}%`, source: 'CoinGecko' });
    }

    // Impermanent loss examples
    const ilScenarios = [
      { scenario: '1.5x price change', il: calculateImpermanentLoss(1.5) },
      { scenario: '2x price change', il: calculateImpermanentLoss(2) },
      { scenario: '3x price change', il: calculateImpermanentLoss(3) },
      { scenario: '5x price change', il: calculateImpermanentLoss(5) },
    ];

    evidence.push({ label: 'DEX liquidity', value: `$${totalLiquidity.toLocaleString()}`, source: 'GoPlus' });
    evidence.push({ label: 'Volatility risk', value: `${volatilityRisk}/100`, source: 'ChainIntel' });

    let riskScore = volatilityRisk * 0.5;
    if (totalLiquidity < 100_000) { riskScore += 20; findings.push({ id: 'low_liquidity', severity: 'warning', title: 'Low DEX liquidity', description: 'High slippage risk for large positions.', source: 'GoPlus' }); }
    if (goplusSec?.is_mintable === '1') { riskScore += 15; findings.push({ id: 'mintable_defi', severity: 'warning', title: 'Mintable token — supply inflation risk', description: 'Owner can mint new tokens, diluting your position.', source: 'GoPlus' }); }

    recommendations.push('Use small position sizes relative to pool liquidity to minimize price impact');
    recommendations.push(`IL at 2x price move: ${ilScenarios[1].il.toFixed(2)}% — factor this into yield calculations`);

    const response = buildResponse(
      'defi/risk', chain, chainConfig.id,
      `DeFi risk for ${address.slice(0, 8)}... on ${chainConfig.name}: Volatility risk ${volatilityRisk}/100. DEX liquidity: $${totalLiquidity.toLocaleString()}. Overall DeFi risk: ${Math.round(riskScore)}/100.`,
      Math.min(100, riskScore), 0.7, findings, recommendations, evidence,
      {
        address, volatility_risk: volatilityRisk, liquidity_usd: totalLiquidity,
        dexes: dexes.map(d => ({ name: d.name, liquidity_usd: parseFloat(d.liquidity || '0') })),
        il_scenarios: ilScenarios,
        market: marketData,
      },
      start, false, dataSources,
    );

    await cache.set(cacheKey, response, 300);
    return response;
  }

  // ─── Default: general DeFi overview ──────────────────────────────────────
  recommendations.push('Specify mode=yield for yield opportunities, mode=risk with an address for token risk analysis');
  const response = buildResponse(
    'defi/analyze', chain, chainConfig.id,
    `DeFi intelligence on ${chainConfig.name}. Use mode=yield for yield opportunities or mode=risk&address=0x... for token risk.`,
    0, 0.5, [], recommendations, [],
    { chain, available_modes: ['yield', 'risk'] },
    start, false, dataSources,
  );

  return response;
}
