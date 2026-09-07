// src/modules/transaction/analyze.ts
import { z } from 'zod';
import { getChainConfig } from '../../types/chains.js';
import { buildResponse, Finding, Evidence } from '../../types/response.js';
import { getWalletTransactions, getContractABI, getContractSource } from '../../adapters/etherscan.js';
import { getTransaction, getTransactionReceipt, simulateTransaction } from '../../adapters/alchemy.js';
import { getAddressSecurity, analyzeMaliciousAddress } from '../../adapters/goplus.js';
import { getTransactionDetail as getOKLinkTxDetail } from '../../adapters/oklink.js';
import { explainTransaction } from '../../adapters/groq.js';
import cache from '../../lib/cache.js';
import logger from '../../lib/logger.js';

export const TransactionAnalyzeSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a valid 32-byte transaction hash (0x + 64 hex chars)'),
  chain: z.string().default('ethereum'),
});

export type TransactionAnalyzeInput = z.infer<typeof TransactionAnalyzeSchema>;

// Common method signatures for decoding
const METHOD_SIGNATURES: Record<string, string> = {
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x38ed1739': 'swapExactTokensForTokens()',
  '0x7ff36ab5': 'swapExactETHForTokens()',
  '0x18cbafe5': 'swapExactTokensForETH()',
  '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens()',
  '0xb6f9de95': 'swapExactETHForTokensSupportingFeeOnTransferTokens()',
  '0x791ac947': 'swapExactTokensForETHSupportingFeeOnTransferTokens()',
  '0xe8e33700': 'addLiquidity()',
  '0xf305d719': 'addLiquidityETH()',
  '0xbaa2abde': 'removeLiquidity()',
  '0x02751cec': 'removeLiquidityETH()',
  '0x5945d85e': 'deposit()',
  '0x47e7ef24': 'deposit(address,uint256)',
  '0x69328dec': 'withdraw(address,uint256,address)',
  '0xd0e30db0': 'deposit()',
  '0x3ccfd60b': 'withdraw()',
  '0x40c10f19': 'mint(address,uint256)',
  '0x42966c68': 'burn(uint256)',
  '0xe7acab24': 'fulfill()',
  '0x150b7a02': 'onERC721Received()',
  '0xf242432a': 'safeTransferFrom()',
};

// Check for unlimited approvals (common phishing pattern)
function isUnlimitedApproval(data: string): boolean {
  if (!data || data.length < 10) return false;
  const method = data.slice(0, 10);
  if (method !== '0x095ea7b3') return false; // Not approve()
  // Last 64 chars = amount. If all f's = unlimited
  const amount = data.slice(-64);
  return amount === 'f'.repeat(64) || amount.toLowerCase() === 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
}

function decodeMethodName(input: string): string {
  if (!input || input === '0x') return 'Native ETH Transfer';
  const sig = input.slice(0, 10).toLowerCase();
  return METHOD_SIGNATURES[sig] || `Unknown Method (${sig})`;
}

function weiToReadable(hex: string, decimals = 18): string {
  try {
    const wei = BigInt(hex || '0');
    const value = Number(wei) / Math.pow(10, decimals);
    if (value === 0) return '0';
    if (value < 0.000001) return `${value.toExponential(4)}`;
    return value.toFixed(6);
  } catch {
    return '0';
  }
}

export async function analyzeTransaction(input: TransactionAnalyzeInput) {
  const start = Date.now();
  const { txHash, chain } = input;
  const chainConfig = getChainConfig(chain);
  const cacheKey = cache.cacheKey('tx', 'analyze', chain, txHash);

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  logger.info('[transaction/analyze] Starting', { txHash, chain });

  const dataSources: string[] = [];
  const findings: Finding[] = [];
  const recommendations: string[] = [];
  const evidence: Evidence[] = [];

  const isXLayer = chainConfig.explorerType === 'oklink';

  // ─── Fetch transaction data ───────────────────────────────────────────────
  const [alchemyTx, alchemyReceipt, oklinkTx] = await Promise.all([
    getTransaction(txHash, chainConfig),
    getTransactionReceipt(txHash, chainConfig),
    isXLayer ? getOKLinkTxDetail(txHash) : Promise.resolve(null),
  ]);

  if (alchemyTx) dataSources.push('Alchemy RPC');
  if (alchemyReceipt) dataSources.push('Alchemy Receipt');
  if (oklinkTx) dataSources.push('OKLink');

  if (!alchemyTx && !oklinkTx) {
    const response = buildResponse(
      'transaction/analyze', chain, chainConfig.id,
      `Transaction ${txHash.slice(0, 12)}... not found on ${chainConfig.name}. It may be pending, failed, or on a different chain.`,
      0, 0.5,
      [{ id: 'not_found', severity: 'warning', title: 'Transaction not found', description: 'Could not locate this transaction. Check the chain and hash.', source: 'Alchemy' }],
      ['Verify the chain matches the transaction — use /analyze to auto-detect'],
      [],
      { txHash, status: 'not_found' },
      start, false, ['Alchemy RPC'],
    );
    return response;
  }

  // ─── Extract transaction fields ────────────────────────────────────────────
  const from = (alchemyTx?.from as string) || oklinkTx?.from || '';
  const to = (alchemyTx?.to as string) || oklinkTx?.to || '';
  const valueHex = (alchemyTx?.value as string) || '0x0';
  const valueEth = weiToReadable(valueHex);
  const inputData = (alchemyTx?.input as string) || '0x';
  const gasUsed = (alchemyReceipt?.gasUsed as string) || '0x0';
  const gasPrice = (alchemyTx?.gasPrice as string) || '0x0';
  const nonce = (alchemyTx?.nonce as string) || '0x0';
  const blockNumber = (alchemyTx?.blockNumber as string) || '0x0';
  const txStatus = alchemyReceipt ? (alchemyReceipt.status === '0x1' ? 'success' : 'failed') : 'pending';

  const gasCostWei = BigInt(gasUsed) * BigInt(gasPrice || '0');
  const gasCostEth = Number(gasCostWei) / 1e18;

  // ─── Method decoding ──────────────────────────────────────────────────────
  const methodName = decodeMethodName(inputData);
  evidence.push({ label: 'Method', value: methodName, source: 'ChainIntel Decoder' });
  evidence.push({ label: 'From', value: from, source: 'Blockchain' });
  evidence.push({ label: 'To', value: to, source: 'Blockchain' });
  evidence.push({ label: 'Value', value: `${valueEth} ${chainConfig.nativeCurrency}`, source: 'Blockchain' });
  evidence.push({ label: 'Gas used', value: parseInt(gasUsed, 16).toLocaleString(), source: 'Receipt' });
  evidence.push({ label: 'Gas cost', value: `${gasCostEth.toFixed(6)} ${chainConfig.nativeCurrency}`, source: 'Receipt' });
  evidence.push({ label: 'Status', value: txStatus, source: 'Receipt' });
  evidence.push({ label: 'Block', value: parseInt(blockNumber, 16).toLocaleString(), source: 'Blockchain' });

  // ─── Security checks ──────────────────────────────────────────────────────
  let riskScore = 0;

  // Unlimited approval check
  const hasUnlimitedApproval = isUnlimitedApproval(inputData);
  if (hasUnlimitedApproval) {
    riskScore += 30;
    findings.push({
      id: 'unlimited_approval',
      severity: 'critical',
      title: 'Unlimited token approval detected',
      description: `This transaction approves ${to.slice(0, 8)}... to spend ALL of your tokens. This is a major phishing risk.`,
      source: 'ChainIntel',
    });
    recommendations.push('DANGER: Unlimited approval detected. If you did not initiate this, revoke immediately at revoke.cash');
  }

  // Check if destination is a known malicious address
  if (to) {
    const toSecurity = await getAddressSecurity(to);
    if (toSecurity) dataSources.push('GoPlus (Destination)');
    const toMalicious = analyzeMaliciousAddress(toSecurity);
    if (toMalicious.isMalicious) {
      riskScore += 50;
      for (const flag of toMalicious.flags) {
        findings.push({ id: `dest_malicious_${findings.length}`, severity: 'critical', title: `Destination flagged: ${flag}`, description: `The destination address ${to.slice(0, 8)}... is marked as: ${flag}`, source: 'GoPlus Security' });
      }
      recommendations.push('DO NOT SIGN — destination address is marked malicious by security databases');
    }
  }

  // Failed transaction
  if (txStatus === 'failed') {
    findings.push({ id: 'tx_failed', severity: 'warning', title: 'Transaction failed (reverted)', description: 'This transaction was reverted on-chain. Gas was still consumed.', source: 'Alchemy Receipt' });
  }

  // Native transfer with data
  if (parseFloat(valueEth) > 0 && inputData !== '0x' && methodName === 'Native ETH Transfer') {
    findings.push({ id: 'eth_with_data', severity: 'warning', title: 'ETH transfer with unexpected input data', description: 'Sending ETH with data attached is unusual and could indicate a complex contract interaction.', source: 'ChainIntel' });
    riskScore += 10;
  }

  // ─── Token transfers from receipt logs ────────────────────────────────────
  const logs = (alchemyReceipt?.logs as Array<{ address: string; topics: string[]; data: string }>) || [];
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const tokenTransfers: Array<{ token: string; from: string; to: string; raw_amount: string }> = [];

  for (const log of logs) {
    if (log.topics[0] === TRANSFER_TOPIC && log.topics.length === 3) {
      const transferFrom = '0x' + (log.topics[1] || '').slice(26);
      const transferTo = '0x' + (log.topics[2] || '').slice(26);
      tokenTransfers.push({ token: log.address, from: transferFrom, to: transferTo, raw_amount: log.data });
    }
  }

  if (tokenTransfers.length > 0) {
    evidence.push({ label: 'Token transfers', value: tokenTransfers.length, source: 'Receipt Logs' });
  }

  // ─── Fetch contract info for destination ─────────────────────────────────
  let destinationContractName = '';
  if (to && !isXLayer) {
    const contractSrc = await getContractSource(to, chainConfig).catch(() => null);
    if (contractSrc?.ContractName) {
      destinationContractName = contractSrc.ContractName;
      evidence.push({ label: 'Destination contract', value: destinationContractName, source: 'Etherscan' });
      dataSources.push('Etherscan (Contract)');
    }
  }

  // ─── AI explanation ───────────────────────────────────────────────────────
  const aiExplanation = await explainTransaction({
    from,
    to,
    value: `${valueEth} ${chainConfig.nativeCurrency}`,
    methodName,
    contractName: destinationContractName || undefined,
    tokenTransfers: tokenTransfers.slice(0, 5).map(t => ({
      token: t.token,
      amount: t.raw_amount,
      direction: t.from.toLowerCase() === from.toLowerCase() ? 'sent' : 'received',
    })),
    warnings: findings.filter(f => f.severity === 'critical').map(f => f.title),
  });

  if (aiExplanation.explanation) dataSources.push('Groq AI');

  // ─── Risk scoring ──────────────────────────────────────────────────────────
  riskScore = Math.min(100, riskScore);
  if (riskScore === 0 && txStatus === 'success') recommendations.push('Transaction appears normal with no obvious security risks');
  if (!hasUnlimitedApproval && methodName.includes('approve')) recommendations.push('Approve only the exact amount needed — avoid unlimited approvals');

  const confidence = Math.min(0.95, 0.4 + dataSources.length * 0.12);
  const summary = aiExplanation.summary
    ? `${aiExplanation.summary} | Status: ${txStatus} | Risk: ${riskScore}/100`
    : `${methodName} on ${chainConfig.name} | Status: ${txStatus} | Risk: ${riskScore}/100`;

  const response = buildResponse(
    'transaction/analyze',
    chain,
    chainConfig.id,
    summary,
    riskScore,
    confidence,
    findings,
    recommendations,
    evidence,
    {
      tx_hash: txHash,
      status: txStatus,
      from,
      to,
      method: methodName,
      value_native: parseFloat(valueEth),
      native_currency: chainConfig.nativeCurrency,
      gas_used: parseInt(gasUsed, 16),
      gas_cost_native: parseFloat(gasCostEth.toFixed(6)),
      block_number: parseInt(blockNumber, 16),
      nonce: parseInt(nonce, 16),
      token_transfers: tokenTransfers,
      has_unlimited_approval: hasUnlimitedApproval,
      destination_contract: destinationContractName || null,
      ai_explanation: aiExplanation.explanation,
      ai_risk_note: aiExplanation.riskNote,
      input_data: inputData.length > 200 ? inputData.slice(0, 200) + '...' : inputData,
    },
    start,
    false,
    dataSources,
  );

  await cache.set(cacheKey, response, 600); // Transactions are immutable, 10 min cache
  return response;
}
