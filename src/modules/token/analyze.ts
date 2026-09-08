import { summarizeTokenSecurity, generateProtocolIntelligence } from '../../adapters/groq.js';
// src/modules/token/analyze.ts
import { z } from 'zod';
import { getChainConfig } from '../../types/chains.js';
import { buildResponse, Finding, Evidence, FindingSeverity } from '../../types/response.js';
import { getTokenSecurity, assessTokenRisk } from '../../adapters/goplus.js';
import { getTokenByContract, extractMarketSummary } from '../../adapters/coingecko.js';
import { getContractSource, getContractCreation, getWalletTransactions } from '../../adapters/etherscan.js';
import { getTokenInfo as getOKLinkTokenInfo, getTokenHolders as getOKLinkHolders } from '../../adapters/oklink.js';
import { getTokenMetadata } from '../../adapters/alchemy.js';
import { getTokenPrice } from '../../adapters/defillama.js';
import cache from '../../lib/cache.js';
import logger from '../../lib/logger.js';

export const TokenAnalyzeSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid EVM contract address'),
  chain: z.string().default('ethereum'),
});

export type TokenAnalyzeInput = z.infer<typeof TokenAnalyzeSchema>;

export async function analyzeToken(input: TokenAnalyzeInput) {
  const start = Date.now();
  const { address, chain } = input;
  const chainConfig = getChainConfig(chain);
  const cacheKey = cache.cacheKey('token', 'analyze', chain, address);

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  logger.info('[token/analyze] Starting', { address, chain });

  const dataSources: string[] = [];
  const findings: Finding[] = [];
  const recommendations: string[] = [];
  const evidence: Evidence[] = [];

  // ─── Collect data in parallel ────────────────────────────────────────────
  const isXLayer = chainConfig.explorerType === 'oklink';

  const [goplusSecurity, cgInfo, contractSource, contractCreation, llamaPrice, alchemyMeta, oklinkInfo] =
    await Promise.all([
      getTokenSecurity(address, chainConfig.goplusChainId),
      chainConfig.id !== 196 ? getTokenByContract(address, chain) : Promise.resolve(null),
      !isXLayer ? getContractSource(address, chainConfig) : Promise.resolve(null),
      !isXLayer ? getContractCreation(address, chainConfig) : Promise.resolve(null),
      getTokenPrice(address, chain),
      getTokenMetadata(address, chainConfig),
      isXLayer ? getOKLinkTokenInfo(address) : Promise.resolve(null),
    ]);

  if (goplusSecurity) dataSources.push('GoPlus Security');
  if (cgInfo) dataSources.push('CoinGecko');
  if (contractSource) dataSources.push('Etherscan');
  if (llamaPrice) dataSources.push('DeFiLlama');
  if (alchemyMeta) dataSources.push('Alchemy');
  if (oklinkInfo) dataSources.push('OKLink');

  // ─── GoPlus Risk Assessment ───────────────────────────────────────────────
  const riskAssessment = assessTokenRisk(goplusSecurity);

  // Add security findings
  for (const flag of riskAssessment.flags) {
    const severity: FindingSeverity = flag.includes('HONEYPOT') || flag.includes('Cannot sell') ? 'critical' : 'warning';
    findings.push({
      id: `token_security_${findings.length}`,
      severity,
      title: flag,
      description: flag,
      source: 'GoPlus Security',
    });
  }

  // ─── Holder Concentration ─────────────────────────────────────────────────
  let top10HoldersPct = 0;
  let holderCount = 0;
  const holdersList: Array<{ address: string; pct: number; tag: string }> = [];

  if (goplusSecurity?.holders) {
    const holders = goplusSecurity.holders.slice(0, 10);
    top10HoldersPct = holders.reduce((sum, h) => sum + parseFloat(h.percent || '0') * 100, 0);
    holderCount = parseInt(goplusSecurity.holder_count || '0');

    for (const h of holders) {
      holdersList.push({
        address: h.address,
        pct: parseFloat(h.percent || '0') * 100,
        tag: h.tag || '',
      });
    }

    evidence.push({ label: 'Top 10 holder concentration', value: `${top10HoldersPct.toFixed(1)}%`, source: 'GoPlus' });
    evidence.push({ label: 'Total holders', value: holderCount.toLocaleString(), source: 'GoPlus' });

    if (top10HoldersPct > 70) {
      findings.push({ id: 'holder_concentration', severity: 'warning', title: `High holder concentration: top 10 hold ${top10HoldersPct.toFixed(1)}%`, description: 'High concentration increases dump risk', source: 'GoPlus' });
      riskAssessment.score = Math.min(100, riskAssessment.score + 10);
    }
  } else if (oklinkInfo) {
    holderCount = parseInt(oklinkInfo.holderCount || '0');
  }

  // ─── Deployer Analysis ────────────────────────────────────────────────────
  let deployerAddress = contractCreation?.contractCreator || goplusSecurity?.creator_address || '';
  if (deployerAddress) {
    evidence.push({ label: 'Deployer address', value: deployerAddress, source: 'Etherscan' });
  }

  // ─── Market Data ──────────────────────────────────────────────────────────
  let marketData = null;
  if (cgInfo) {
    marketData = extractMarketSummary(cgInfo);
    evidence.push({ label: 'Price (USD)', value: `$${marketData.price_usd.toFixed(6)}`, source: 'CoinGecko' });
    evidence.push({ label: 'Market cap (USD)', value: `$${marketData.market_cap_usd.toLocaleString()}`, source: 'CoinGecko' });
    evidence.push({ label: '24h volume', value: `$${marketData.volume_24h_usd.toLocaleString()}`, source: 'CoinGecko' });
    evidence.push({ label: '24h price change', value: `${marketData.price_change_24h_pct.toFixed(2)}%`, source: 'CoinGecko' });
  }

  const llamaPriceUsd = llamaPrice?.price;
  if (llamaPriceUsd && !cgInfo) {
    evidence.push({ label: 'Price (USD)', value: `$${llamaPriceUsd.toFixed(6)}`, source: 'DeFiLlama' });
  }

  // ─── Token metadata ────────────────────────────────────────────────────────
  const tokenName = cgInfo?.name || alchemyMeta?.name || goplusSecurity?.token_name || oklinkInfo?.token || 'Unknown';
  const tokenSymbol = cgInfo?.symbol?.toUpperCase() || alchemyMeta?.symbol || goplusSecurity?.token_symbol || oklinkInfo?.token || '???';
  const totalSupply = alchemyMeta?.totalSupply || goplusSecurity?.total_supply || oklinkInfo?.totalSupply || 'Unknown';

  // ─── Liquidity ─────────────────────────────────────────────────────────────
  const dexData = goplusSecurity?.dex || [];
  const totalLiquidity = dexData.reduce((sum, d) => sum + parseFloat(d.liquidity || '0'), 0);
  if (dexData.length > 0) {
    evidence.push({ label: 'Total DEX liquidity', value: `$${totalLiquidity.toLocaleString()}`, source: 'GoPlus' });
    evidence.push({ label: 'Listed DEXes', value: dexData.map(d => d.name).join(', '), source: 'GoPlus' });
  }

  // ─── Contract info ─────────────────────────────────────────────────────────
  const isOpenSource = goplusSecurity?.is_open_source === '1';
  const isProxy = goplusSecurity?.is_proxy === '1';
  const isMintable = goplusSecurity?.is_mintable === '1';

  evidence.push({ label: 'Source code verified', value: isOpenSource, source: 'GoPlus' });
  evidence.push({ label: 'Is proxy contract', value: isProxy, source: 'GoPlus' });
  evidence.push({ label: 'Is mintable', value: isMintable, source: 'GoPlus' });

  // ─── Recommendations ──────────────────────────────────────────────────────
  if (riskAssessment.isHoneypot) {
    recommendations.push('DO NOT trade this token — it is a honeypot (you cannot sell after buying)');
  } else if (riskAssessment.score >= 70) {
    recommendations.push('Exercise extreme caution — multiple high-risk signals detected');
    recommendations.push('Verify the project team and check for recent social activity before interacting');
  } else if (riskAssessment.score >= 40) {
    recommendations.push('Proceed with caution — moderate risk signals present');
    recommendations.push('Check the deployer wallet history and token holder distribution');
  } else {
    recommendations.push('Risk signals are relatively low but always DYOR');
    recommendations.push('Verify liquidity is sufficient for your position size');
  }

  if (!isOpenSource) recommendations.push('Source code is not verified — exercise additional caution');
  if (totalLiquidity < 50000 && totalLiquidity > 0) recommendations.push('Low liquidity detected — large positions may cause significant slippage');

  // ─── Confidence ───────────────────────────────────────────────────────────
  const confidence = Math.min(0.95, dataSources.length * 0.18);

  // ─── Summary ──────────────────────────────────────────────────────────────
  let aiTokenFeedback: any = null;
  try {
    aiTokenFeedback = await summarizeTokenSecurity({
      name: tokenName,
      symbol: tokenSymbol,
      riskScore: riskAssessment.score,
      isHoneypot: riskAssessment.isHoneypot,
      buyTax: 0,
      sellTax: 0,
      liquidityUsd: totalLiquidity,
      holderCount,
      isOpenSource,
      isProxy,
      isMintable,
      findings: findings.map(f => f.title),
    });
    if (aiTokenFeedback?.aiSummary) dataSources.push('Groq AI');
  } catch { /* ignore */ }

  const riskLabel = riskAssessment.score >= 70 ? 'HIGH RISK' : riskAssessment.score >= 40 ? 'MODERATE RISK' : 'LOW RISK';
  const summary = riskAssessment.isHoneypot
    ? `🚨 HONEYPOT DETECTED — ${tokenName} (${tokenSymbol}) cannot be sold once purchased. Do not trade.`
    : `${tokenName} (${tokenSymbol}) on ${chainConfig.name}: ${riskLabel} (score ${riskAssessment.score}/100). ${findings.length} risk signal(s) detected. ${holderCount > 0 ? `${holderCount.toLocaleString()} holders` : ''}.`;

  // --- Generate Full Protocol Intelligence Cards (Screenshot layout) ---
  let protocolIntelligence: any = null;
  try {
    protocolIntelligence = await generateProtocolIntelligence({
      name: tokenName,
      symbol: tokenSymbol,
      address,
      chain,
      riskScore: Math.round(riskAssessment.score),
      isVerified: isOpenSource,
      isProxy,
      isHoneypot: riskAssessment.isHoneypot,
      privilegedCount: 0,
      liquidityUsd: totalLiquidity,
      holders: holderCount,
    });
  } catch { /* ignore */ }

  const response = buildResponse(
    'token/analyze',
    chain,
    chainConfig.id,
    summary,
    riskAssessment.score,
    confidence,
    findings,
    recommendations,
    evidence,
    {
      address,
      name: tokenName,
      symbol: tokenSymbol,
      total_supply: totalSupply,
      holder_count: holderCount,
      top_10_holders_pct: parseFloat(top10HoldersPct.toFixed(2)),
      holders: holdersList,
      dex_liquidity_usd: totalLiquidity,
      dexes: dexData.map(d => ({ name: d.name, liquidity_usd: parseFloat(d.liquidity || '0'), pair: d.pair })),
      is_honeypot: riskAssessment.isHoneypot,
      is_open_source: isOpenSource,
      is_proxy: isProxy,
      is_mintable: isMintable,
      deployer: deployerAddress,
      deploy_tx: contractCreation?.txHash,
      market: marketData,
      security_flags: riskAssessment.flags,
      protocol_intelligence: protocolIntelligence,
      ai_summary: aiTokenFeedback?.aiSummary || '',
      ai_feedback: {
        why_risk_score: aiTokenFeedback?.whyRiskScore || '',
        why_designed_this_way: aiTokenFeedback?.whyDesignedThisWay || '',
        security_feedback: aiTokenFeedback?.securityFeedback || '',
      },
    },
    start,
    false,
    dataSources,
  );

  await cache.set(cacheKey, response, 180); // 3 min cache for token data
  return response;
}
