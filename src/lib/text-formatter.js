// src/lib/text-formatter.ts
// Converts raw JSON API responses into clean readable text for AI agents & MCP callers

function line(label, value, unit = '') {
  if (value === undefined || value === null || value === '') return '';
  const val = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return '- ' + label + ': ' + val + unit + '\n';
}

function section(title, content) {
  if (!content.trim()) return '';
  return '\n=== ' + title.toUpperCase() + ' ===\n' + content;
}

function flags(arr, label) {
  if (!arr || arr.length === 0) return '- ' + label + ': None detected\n';
  return '- ' + label + ':\n' + arr.map(f => '  [!] ' + f).join('\n') + '\n';
}

function verdict(v) {
  if (!v) return '';
  const upper = v.toUpperCase();
  if (upper === 'ALLOW' || upper === 'SAFE' || upper === 'PASS') return '[PASS] VERDICT: ' + upper;
  if (upper.includes('WARN')) return '[WARN] VERDICT: ' + upper;
  if (upper === 'BLOCK' || upper === 'UNSAFE' || upper === 'FAIL') return '[BLOCK] VERDICT: ' + upper;
  return '- Verdict: ' + v;
}

function formatTokenText(raw) {
  const d = raw && raw.data ? raw.data : (raw || {});
  const intel = d.protocol_intelligence || {};
  const market = d.market || {};
  const feedback = d.ai_feedback || {};

  let out = 'AUDIT REPORT - TOKEN RISK SENTINEL\n';
  out += '='.repeat(50) + '\n';
  out += 'Analysed on BNB Chain via AUDIT Intelligence Layer\n';

  out += section('Token Identity', [
    line('Token Name', d.name),
    line('Symbol', d.symbol),
    line('Contract Address', d.address),
    line('Total Supply', d.total_supply),
    line('Holder Count', d.holder_count && d.holder_count.toLocaleString ? d.holder_count.toLocaleString() : d.holder_count),
    line('Top 10 Holders', d.top_10_holders_pct),
    line('Deployer', d.deployer),
  ].join(''));

  out += section('Security Checks', [
    line('Honeypot Detected', d.is_honeypot),
    line('Source Code Verified', d.is_open_source),
    line('Proxy Contract', d.is_proxy),
    line('Mintable Supply Risk', d.is_mintable),
    flags(d.security_flags, 'Security Flags'),
  ].join(''));

  out += section('Liquidity & Market Data', [
    line('DEX Liquidity USD', d.dex_liquidity_usd ? '$' + Number(d.dex_liquidity_usd).toLocaleString() : undefined),
    line('DEX Platforms', Array.isArray(d.dexes) ? d.dexes.join(', ') : d.dexes),
    line('Price', market.price ? '$' + market.price : undefined),
    line('24h Volume', market.volume24h ? '$' + Number(market.volume24h).toLocaleString() : undefined),
    line('Market Cap', market.marketCap ? '$' + Number(market.marketCap).toLocaleString() : undefined),
    line('Sentiment Score', market.sentimentScore),
    line('Volume TVL Ratio', market.volumeTvlRatio),
    line('Whale Dispersion', market.whaleDispersion),
  ].join(''));

  out += section('Deep AI Protocol Reasoning', [
    line('Protocol Details & Architecture', intel.details),
    line('Health & Solvency Status', intel.health),
    line('Price & Liquidity Depth', intel.priceLiquidity),
    line('Market Sentiment & Velocity', intel.sentimentVelocity),
  ].join(''));

  out += section('Exploit Vector Assessment', [
    line('Oracle Manipulation Risk', (feedback.oracleManipulation && feedback.oracleManipulation.severity) || (intel.exploits && intel.exploits.oracle)),
    line('Admin Key / Proxy Hijack Risk', (feedback.adminKeyRisk && feedback.adminKeyRisk.severity) || (intel.exploits && intel.exploits.admin)),
    line('Reentrancy & Flash Loan Exposure', (feedback.reentrancyFlashLoan && feedback.reentrancyFlashLoan.severity) || (intel.exploits && intel.exploits.reentrancy)),
    line('Collateral Liquidation Cascade', (feedback.liquidationCascade && feedback.liquidationCascade.severity) || (intel.exploits && intel.exploits.liquidation)),
    line('Oracle Manipulation Description', feedback.oracleManipulation && feedback.oracleManipulation.description),
    line('Admin Key Description', feedback.adminKeyRisk && feedback.adminKeyRisk.description),
    line('Reentrancy Description', feedback.reentrancyFlashLoan && feedback.reentrancyFlashLoan.description),
    line('Liquidation Description', feedback.liquidationCascade && feedback.liquidationCascade.description),
  ].join(''));

  const watchItems = (feedback.watchItems) || [];
  if (watchItems.length > 0) {
    out += section('Actionable Intelligence: What to Watch', watchItems.map(w => '  -> ' + w).join('\n') + '\n');
  }

  if (d.ai_summary) {
    out += section('AI Security Summary', d.ai_summary + '\n');
  }

  if ((feedback && feedback.verdict) || d.verdict) {
    out += '\n' + verdict((feedback && feedback.verdict) || d.verdict) + '\n';
  }

  out += '\n' + '-'.repeat(50) + '\n';
  out += 'Powered by AUDIT Binance Agent OS\n';
  return out;
}

function formatContractText(raw) {
  const d = raw && raw.data ? raw.data : (raw || {});
  const intel = d.protocol_intelligence || {};
  const feedback = d.ai_feedback || {};

  let out = 'AUDIT REPORT - SMART CONTRACT SECURITY AUDIT\n';
  out += '='.repeat(50) + '\n';
  out += 'Analysed on BNB Chain via AUDIT Intelligence Layer\n';

  out += section('Contract Identity', [
    line('Contract Name', d.name),
    line('Contract Address', d.address),
    line('Compiler Version', d.compiler),
    line('Deployer', d.deployer),
    line('Deploy Transaction', d.deploy_tx),
  ].join(''));

  out += section('Contract Specifications', [
    line('Source Code Verified', d.is_verified),
    line('Proxy Contract', d.is_proxy),
    line('Proxy Type', d.proxy_type),
    line('Implementation Address', d.implementation_address),
    line('Ownership Pattern', d.ownership_pattern),
    line('Has Self-Destruct', d.has_self_destruct),
    line('Complexity Score', d.complexity_score),
    line('Total Functions', d.function_count),
  ].join(''));

  out += section('Privileged Functions', (() => {
    if (!d.privileged_functions || d.privileged_functions.length === 0) {
      return '- No privileged admin functions detected\n';
    }
    return d.privileged_functions.map(f =>
      '  [!] ' + (typeof f === 'string' ? f : (f.name || f.sig || JSON.stringify(f)))
    ).join('\n') + '\n';
  })());

  out += section('Security Flags', (() => {
    if (!d.security_flags || d.security_flags.length === 0) return '- No critical security flags detected\n';
    return d.security_flags.map(f => '  [!] ' + f).join('\n') + '\n';
  })());

  out += section('Exploit Vector Assessment', [
    line('Oracle Manipulation Risk', (feedback.oracleManipulation && feedback.oracleManipulation.severity) || (intel.exploits && intel.exploits.oracle)),
    line('Admin Key / Proxy Hijack Risk', (feedback.adminKeyRisk && feedback.adminKeyRisk.severity) || (intel.exploits && intel.exploits.admin)),
    line('Reentrancy & Flash Loan Exposure', (feedback.reentrancyFlashLoan && feedback.reentrancyFlashLoan.severity) || (intel.exploits && intel.exploits.reentrancy)),
    line('Collateral Liquidation Cascade', (feedback.liquidationCascade && feedback.liquidationCascade.severity) || (intel.exploits && intel.exploits.liquidation)),
    line('Oracle Description', feedback.oracleManipulation && feedback.oracleManipulation.description),
    line('Admin Key Description', feedback.adminKeyRisk && feedback.adminKeyRisk.description),
    line('Reentrancy Description', feedback.reentrancyFlashLoan && feedback.reentrancyFlashLoan.description),
    line('Liquidation Description', feedback.liquidationCascade && feedback.liquidationCascade.description),
  ].join(''));

  if (d.ai_purpose) out += section('Contract Purpose', d.ai_purpose + '\n');
  if (d.ai_summary) out += section('AI Security Summary', d.ai_summary + '\n');

  if (Array.isArray(d.ai_key_functions) && d.ai_key_functions.length > 0) {
    out += section('Key Functions', d.ai_key_functions.map(f => '  - ' + f).join('\n') + '\n');
  }

  const watchItems = (feedback.watchItems) || (intel.watchItems) || [];
  if (watchItems.length > 0) {
    out += section('Actionable Intelligence: What to Watch', watchItems.map(w => '  -> ' + w).join('\n') + '\n');
  }

  if ((feedback && feedback.verdict) || d.verdict) {
    out += '\n' + verdict((feedback && feedback.verdict) || d.verdict) + '\n';
  }

  out += '\n' + '-'.repeat(50) + '\n';
  out += 'Powered by AUDIT Binance Agent OS\n';
  return out;
}

function formatWalletText(raw) {
  const d = raw && raw.data ? raw.data : (raw || {});

  let out = 'AUDIT REPORT - WALLET RISK PROFILER\n';
  out += '='.repeat(50) + '\n';

  out += section('Wallet Identity', [
    line('Address', d.address),
    line('Wallet Type', d.wallet_type),
    line('Description', d.wallet_description),
    line('Is Contract', d.is_contract),
    line('Wallet Age', d.wallet_age_days ? d.wallet_age_days + ' days' : undefined),
    line('First Transaction', d.first_tx_timestamp),
  ].join(''));

  out += section('Balance & Activity', [
    line('Native Balance', d.balance_native ? d.balance_native + ' ' + (d.native_currency || 'BNB') : undefined),
    line('Transaction Count', d.transaction_count && d.transaction_count.toLocaleString ? d.transaction_count.toLocaleString() : d.transaction_count),
    line('Avg Tx Frequency', d.tx_frequency_per_day ? d.tx_frequency_per_day + ' txs/day' : undefined),
    line('Protocols Used', Array.isArray(d.protocols_used) ? d.protocols_used.join(', ') : d.protocols_used),
  ].join(''));

  out += section('Risk Signals', [
    line('Malicious Wallet', d.is_malicious),
    line('Mixer Interaction Detected', d.has_mixer_interaction),
    line('Bot Probability', d.bot_probability !== undefined ? d.bot_probability + '%' : undefined),
    line('Whale Score', d.whale_score !== undefined ? d.whale_score + '/100' : undefined),
    line('Reputation Score', d.reputation_score !== undefined ? d.reputation_score + '/100' : undefined),
    flags(d.malicious_flags, 'Risk Flags'),
  ].join(''));

  if (Array.isArray(d.recommendations) && d.recommendations.length > 0) {
    out += section('Security Recommendations', d.recommendations.map(r => '  -> ' + r).join('\n') + '\n');
  }

  if (d.verdict) out += '\n' + verdict(d.verdict) + '\n';

  out += '\n' + '-'.repeat(50) + '\n';
  out += 'Powered by AUDIT Binance Agent OS\n';
  return out;
}

function formatTransactionText(raw) {
  const d = raw && raw.data ? raw.data : (raw || {});

  let out = 'AUDIT REPORT - PRE-TRADE TRANSACTION SIMULATION\n';
  out += '='.repeat(50) + '\n';

  out += section('Transaction Details', [
    line('Transaction Hash', d.txHash || d.tx_hash),
    line('From', d.from),
    line('To', d.to),
    line('Value', d.value),
    line('Method / Function', d.method || d.function_name),
    line('Status', d.status),
    line('Block', d.block),
    line('Gas Used', d.gas_used && d.gas_used.toLocaleString ? d.gas_used.toLocaleString() : d.gas_used),
    line('Gas Price', d.gas_price),
  ].join(''));

  out += section('Simulation Results', [
    line('Execution Outcome', d.simulation_status || d.outcome),
    line('Success', d.success),
    line('Drainer Pattern Detected', d.is_drainer),
    line('Phishing Risk', d.phishing_risk),
    line('Token Transfers', Array.isArray(d.token_transfers) ? d.token_transfers.length + ' transfer(s)' : d.token_transfers),
    line('Slippage', d.slippage),
    flags(d.security_flags, 'Simulation Flags'),
  ].join(''));

  if (d.explanation || d.ai_explanation) {
    out += section('AI Explanation', (d.explanation || d.ai_explanation) + '\n');
  }

  if (Array.isArray(d.recommendations) && d.recommendations.length > 0) {
    out += section('Pre-Trade Guardrails', d.recommendations.map(r => '  -> ' + r).join('\n') + '\n');
  }

  if (d.verdict) out += '\n' + verdict(d.verdict) + '\n';

  out += '\n' + '-'.repeat(50) + '\n';
  out += 'Powered by AUDIT Binance Agent OS\n';
  return out;
}

function formatDecisionText(raw) {
  const d = raw && raw.data ? raw.data : (raw || {});

  let out = 'AUDIT REPORT - AUTONOMOUS AGENT DECISION ENGINE\n';
  out += '='.repeat(50) + '\n';

  out += section('Decision Context', [
    line('Action Evaluated', d.context || d.action),
    line('Risk Score', d.risk_score !== undefined ? d.risk_score + '/100' : undefined),
    line('Confidence', d.confidence),
  ].join(''));

  if (d.verdict || d.decision) {
    out += '\n' + verdict(d.verdict || d.decision) + '\n';
  }

  if (Array.isArray(d.findings) && d.findings.length > 0) {
    out += section('Risk Findings', d.findings.map(f => '  [!] ' + f).join('\n') + '\n');
  }

  if (d.reasoning || d.summary) {
    out += section('Reasoning & Agent Actions', (d.reasoning || d.summary) + '\n');
  }

  if (Array.isArray(d.recommendations) && d.recommendations.length > 0) {
    out += section('Recommendations', d.recommendations.map(r => '  -> ' + r).join('\n') + '\n');
  }

  out += '\n' + '-'.repeat(50) + '\n';
  out += 'Powered by AUDIT Binance Agent OS\n';
  return out;
}

function formatMarketDepthText(raw) {
  const d = raw && raw.data ? raw.data : (raw || {});
  const ob = d.orderBook || {};
  const fr = d.fundingRate;

  let out = 'AUDIT REPORT - BINANCE REAL-TIME ORDERBOOK TELEMETRY\n';
  out += '='.repeat(50) + '\n';

  out += section('Live Spot Price', [
    line('Symbol', d.symbol),
    line('Current Price', d.lastPrice !== undefined ? '$' + Number(d.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2 }) : undefined),
    line('24h Change', d.priceChange24hPercent !== undefined ? (Number(d.priceChange24hPercent) >= 0 ? '+' : '') + Number(d.priceChange24hPercent).toFixed(2) + '%' : undefined),
    line('24h High', d.high24h !== undefined ? '$' + Number(d.high24h).toLocaleString(undefined, { minimumFractionDigits: 2 }) : undefined),
    line('24h Low', d.low24h !== undefined ? '$' + Number(d.low24h).toLocaleString(undefined, { minimumFractionDigits: 2 }) : undefined),
    line('24h Volume USD', d.volume24hUSD ? '$' + Math.round(Number(d.volume24hUSD)).toLocaleString() : undefined),
    line('Market Regime', d.marketRegime ? d.marketRegime.replace(/_/g, ' ').toUpperCase() : undefined),
  ].join(''));

  out += section('Orderbook Depth & Liquidity', [
    line('Bid/Ask Spread', ob.spreadPercent !== undefined ? Number(ob.spreadPercent).toFixed(3) + '%' : undefined),
    line('Total Bid Depth (Buyers)', ob.bidDepthUSD ? '$' + Math.round(Number(ob.bidDepthUSD)).toLocaleString() : undefined),
    line('Total Ask Depth (Sellers)', ob.askDepthUSD ? '$' + Math.round(Number(ob.askDepthUSD)).toLocaleString() : undefined),
    line('Orderbook Imbalance Signal', ob.depthImbalance),
    line('Bid/Ask Ratio', ob.bidDepthUSD && ob.askDepthUSD ? (Number(ob.bidDepthUSD) / Number(ob.askDepthUSD)).toFixed(2) + 'x' : undefined),
  ].join(''));

  if (Array.isArray(ob.bids) && ob.bids.length > 0) {
    out += section('Top 5 Bid Orders (Buy Pressure)', ob.bids.slice(0, 5).map(
      b => '  $' + Number(b[0]).toFixed(2) + '  -  ' + Number(b[1]).toFixed(4) + ' units'
    ).join('\n') + '\n');
  }

  if (Array.isArray(ob.asks) && ob.asks.length > 0) {
    out += section('Top 5 Ask Orders (Sell Pressure)', ob.asks.slice(0, 5).map(
      a => '  $' + Number(a[0]).toFixed(2) + '  -  ' + Number(a[1]).toFixed(4) + ' units'
    ).join('\n') + '\n');
  }

  if (fr) {
    out += section('Futures Funding Rate', [
      line('Funding Rate', fr.ratePercent !== undefined ? Number(fr.ratePercent).toFixed(4) + '%' : undefined),
      line('Annualised Rate', fr.annualizedPercent !== undefined ? Number(fr.annualizedPercent).toFixed(2) + '% APR' : undefined),
      line('Market Sentiment', fr.sentiment && fr.sentiment.replace ? fr.sentiment.replace(/_/g, ' ') : fr.sentiment),
    ].join(''));
  }

  out += '\n' + '-'.repeat(50) + '\n';
  out += 'Data Source: Binance Spot REST API\n';
  out += 'Powered by AUDIT Binance Agent OS\n';
  return out;
}

function formatProtocolText(raw) {
  const d = raw && raw.data ? raw.data : (raw || {});

  let out = 'AUDIT REPORT - DEFI PROTOCOL ANALYSIS\n';
  out += '='.repeat(50) + '\n';

  out += section('Protocol Overview', [
    line('Protocol Name', d.name || d.protocol),
    line('Category', d.category),
    line('Chain', d.chain),
    line('TVL Total Value Locked', d.tvl ? '$' + Number(d.tvl).toLocaleString() : undefined),
    line('TVL Change 24h', d.tvl_change_24h ? d.tvl_change_24h + '%' : undefined),
    line('Active Chains', Array.isArray(d.chains) ? d.chains.join(', ') : d.chains),
  ].join(''));

  out += section('Security Record', [
    line('Audit Count', d.audit_count),
    line('Last Audit', d.last_audit),
    line('Auditing Firms', Array.isArray(d.auditors) ? d.auditors.join(', ') : d.auditors),
    line('Known Exploits', d.exploit_count !== undefined ? d.exploit_count : 'None'),
    line('Total Hacked Amount', d.total_hacked_usd ? '$' + Number(d.total_hacked_usd).toLocaleString() : 'None'),
    flags(d.security_flags, 'Security Flags'),
  ].join(''));

  if (d.ai_summary) out += section('AI Summary', d.ai_summary + '\n');
  if (d.verdict) out += '\n' + verdict(d.verdict) + '\n';

  out += '\n' + '-'.repeat(50) + '\n';
  out += 'Powered by AUDIT Binance Agent OS\n';
  return out;
}

function formatDeFiText(raw) {
  const d = raw && raw.data ? raw.data : (raw || {});

  let out = 'AUDIT REPORT - DEFI YIELD & RISK ANALYSIS\n';
  out += '='.repeat(50) + '\n';

  const pools = d.yield_pools || d.pools || [];
  if (pools.length > 0) {
    out += section('Yield Opportunities', pools.map(p =>
      '  - ' + (p.protocol || p.name || 'Pool') + ': ' + (p.apy || p.apr || 'N/A') + ' APY - TVL $' + Number(p.tvl || 0).toLocaleString()
    ).join('\n') + '\n');
  }

  out += section('Risk Assessment', [
    line('Overall Risk', d.risk_level || d.risk),
    line('Impermanent Loss Risk', d.impermanent_loss_risk),
    line('Liquidation Distance', d.liquidation_distance),
    line('Collateral Ratio', d.collateral_ratio),
    flags(d.security_flags, 'Risk Flags'),
  ].join(''));

  if (d.ai_summary) out += section('AI Summary', d.ai_summary + '\n');

  out += '\n' + '-'.repeat(50) + '\n';
  out += 'Powered by AUDIT Binance Agent OS\n';
  return out;
}

function formatUnifiedText(raw) {
  const module = (raw && raw.module || '').toLowerCase();
  if (module.includes('token')) return formatTokenText(raw);
  if (module.includes('contract')) return formatContractText(raw);
  if (module.includes('wallet')) return formatWalletText(raw);
  if (module.includes('tx') || module.includes('transaction')) return formatTransactionText(raw);
  if (module.includes('protocol')) return formatProtocolText(raw);
  if (module.includes('defi')) return formatDeFiText(raw);
  if (module.includes('decision')) return formatDecisionText(raw);
  const d = raw && raw.data ? raw.data : (raw || {});
  let out = 'AUDIT REPORT - SECURITY ANALYSIS RESULT\n' + '='.repeat(50) + '\n';
  Object.entries(d).forEach(([k, v]) => {
    if (v !== null && v !== undefined && typeof v !== 'object') {
      out += '- ' + k.replace(/_/g, ' ') + ': ' + v + '\n';
    }
  });
  return out;
}

module.exports = {
  formatTokenText,
  formatContractText,
  formatWalletText,
  formatTransactionText,
  formatDecisionText,
  formatMarketDepthText,
  formatProtocolText,
  formatDeFiText,
  formatUnifiedText,
};
