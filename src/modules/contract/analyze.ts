// src/modules/contract/analyze.ts
import { z } from 'zod';
import { getChainConfig } from '../../types/chains.js';
import { buildResponse, Finding, Evidence } from '../../types/response.js';
import { getContractSource, getContractABI, getContractCreation } from '../../adapters/etherscan.js';
import { getContractSecurity, assessTokenRisk } from '../../adapters/goplus.js';
import { isContract, getCode } from '../../adapters/alchemy.js';
import { summarizeContract, generateProtocolIntelligence } from '../../adapters/groq.js';
import cache from '../../lib/cache.js';
import logger from '../../lib/logger.js';

export const ContractAnalyzeSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid EVM contract address'),
  chain: z.string().default('ethereum'),
});

export type ContractAnalyzeInput = z.infer<typeof ContractAnalyzeSchema>;

// Parse ABI for privileged function detection
function extractPrivilegedFunctions(abiJson: string): Array<{ name: string; reason: string }> {
  const privileged: Array<{ name: string; reason: string }> = [];
  try {
    const abi = JSON.parse(abiJson) as Array<{ type: string; name?: string; inputs?: Array<{ name: string; type: string }> }>;
    const PRIVILEGED_PATTERNS: Record<string, string> = {
      pause: 'Can halt all contract operations',
      unpause: 'Resumes contract after pause',
      setFee: 'Can modify fee structure',
      setTax: 'Can modify tax rates',
      mint: 'Can create new tokens (inflates supply)',
      burn: 'Can destroy tokens',
      blacklist: 'Can block specific addresses',
      whitelist: 'Can restrict access',
      transferOwnership: 'Changes contract ownership',
      renounceOwnership: 'Removes ownership (permanent)',
      upgradeTo: 'Upgrades contract implementation (proxy)',
      upgradeToAndCall: 'Upgrades and calls (proxy)',
      setImplementation: 'Changes implementation contract',
      selfdestruct: 'Destroys the contract permanently',
      withdraw: 'Withdraws funds from contract',
      emergencyWithdraw: 'Emergency fund withdrawal',
      setMaxWallet: 'Limits wallet holdings',
      setMaxTx: 'Limits transaction size',
      excludeFromFee: 'Exempts addresses from fees',
    };
    for (const item of abi) {
      if (item.type === 'function' && item.name) {
        const reason = PRIVILEGED_PATTERNS[item.name];
        if (reason) privileged.push({ name: item.name, reason });
      }
    }
  } catch { /* invalid JSON */ }
  return privileged;
}

function detectProxyPattern(sourceCode: string): { isProxy: boolean; proxyType: string } {
  if (!sourceCode) return { isProxy: false, proxyType: 'none' };
  if (sourceCode.includes('EIP1967') || sourceCode.includes('eip1967')) return { isProxy: true, proxyType: 'EIP-1967 Transparent Proxy' };
  if (sourceCode.includes('UUPSUpgradeable') || sourceCode.includes('UUPS')) return { isProxy: true, proxyType: 'UUPS Proxy' };
  if (sourceCode.includes('BeaconProxy') || sourceCode.includes('UpgradeableBeacon')) return { isProxy: true, proxyType: 'Beacon Proxy' };
  if (sourceCode.includes('delegatecall')) return { isProxy: true, proxyType: 'Custom Proxy (delegatecall detected)' };
  return { isProxy: false, proxyType: 'none' };
}

function detectOwnershipPattern(sourceCode: string): { pattern: string; renounced: boolean } {
  if (!sourceCode) return { pattern: 'unknown', renounced: false };
  if (sourceCode.includes('Ownable2Step')) return { pattern: 'Two-step ownership (safer)', renounced: false };
  if (sourceCode.includes('Ownable')) return { pattern: 'Single-owner (Ownable)', renounced: false };
  if (sourceCode.includes('AccessControl') || sourceCode.includes('ADMIN_ROLE')) return { pattern: 'Role-based access control', renounced: false };
  if (sourceCode.includes('Multisig') || sourceCode.includes('multisig')) return { pattern: 'Multisig', renounced: false };
  return { pattern: 'Custom or no ownership', renounced: false };
}

export async function analyzeContract(input: ContractAnalyzeInput) {
  const start = Date.now();
  const { address, chain } = input;
  const chainConfig = getChainConfig(chain);
  const cacheKey = cache.cacheKey('contract', 'analyze', chain, address);

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  logger.info('[contract/analyze] Starting', { address, chain });

  const dataSources: string[] = [];
  const findings: Finding[] = [];
  const recommendations: string[] = [];
  const evidence: Evidence[] = [];

  const isXLayer = chainConfig.explorerType === 'oklink';

  // â”€â”€â”€ Parallel data fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [contractBytes, contractSource, contractABI, contractCreation, goplusSecurity] = await Promise.all([
    getCode(address, chainConfig),
    !isXLayer ? getContractSource(address, chainConfig) : Promise.resolve(null),
    !isXLayer ? getContractABI(address, chainConfig) : Promise.resolve(null),
    !isXLayer ? getContractCreation(address, chainConfig) : Promise.resolve(null),
    getContractSecurity(address, chainConfig.goplusChainId),
  ]);

  // Verify it's actually a contract
  const isActualContract = contractBytes !== '0x' && contractBytes.length > 2;
  if (!isActualContract) {
  

  const response = buildResponse(
      'contract/analyze', chain, chainConfig.id,
      `Address ${address.slice(0, 8)}... is not a smart contract on ${chainConfig.name} â€” it is an externally owned account (EOA).`,
      0, 0.99, [{ id: 'not_contract', severity: 'info', title: 'Not a contract', description: 'This address has no deployed bytecode â€” it is a wallet, not a contract.', source: 'Alchemy' }],
      ['Analyze this as a wallet using /wallet/analyze instead'], [],
      { address, is_contract: false, reason: 'No bytecode found' },
      start, false, ['Alchemy RPC'],
    );
    return response;
  }

  dataSources.push('Alchemy RPC');
  if (contractSource) dataSources.push('Etherscan');
  if (goplusSecurity) dataSources.push('GoPlus Security');

  const sourceCode = contractSource?.SourceCode || '';
  const abiStr = contractABI || contractSource?.ABI || '[]';
  const contractName = contractSource?.ContractName || 'Unknown Contract';
  const compiler = contractSource?.CompilerVersion || 'Unknown';
  const isVerified = sourceCode.length > 0;

  evidence.push({ label: 'Contract name', value: contractName, source: 'Etherscan' });
  evidence.push({ label: 'Source verified', value: isVerified, source: 'Etherscan' });
  evidence.push({ label: 'Compiler', value: compiler, source: 'Etherscan' });

  // â”€â”€â”€ Proxy detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const proxyInfo = detectProxyPattern(sourceCode);
  const proxyFromGoplus = goplusSecurity?.is_proxy === '1';
  const isProxy = proxyInfo.isProxy || proxyFromGoplus;
  evidence.push({ label: 'Is upgradeable proxy', value: isProxy, source: 'ChainIntel' });
  if (isProxy) {
    findings.push({ id: 'is_proxy', severity: 'warning', title: `Upgradeable proxy (${proxyInfo.proxyType || 'detected by GoPlus'})`, description: 'Contract implementation can be changed by the owner. Behavior may change after upgrade.', source: 'ChainIntel' });
  }

  // â”€â”€â”€ Ownership detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const ownershipInfo = detectOwnershipPattern(sourceCode);
  evidence.push({ label: 'Ownership pattern', value: ownershipInfo.pattern, source: 'ChainIntel' });

  const implementationAddress = contractSource?.Implementation || '';
  if (implementationAddress && implementationAddress !== '0x0000000000000000000000000000000000000000') {
    evidence.push({ label: 'Implementation address', value: implementationAddress, source: 'Etherscan' });
  }

  // â”€â”€â”€ Privileged functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const privilegedFunctions = extractPrivilegedFunctions(abiStr);
  evidence.push({ label: 'Privileged functions found', value: privilegedFunctions.length, source: 'ChainIntel ABI Parser' });

  for (const fn of privilegedFunctions.slice(0, 5)) {
    const isDangerous = ['mint', 'selfdestruct', 'pause', 'blacklist', 'setTax', 'setFee'].includes(fn.name);
    findings.push({
      id: `priv_fn_${fn.name}`,
      severity: isDangerous ? 'warning' : 'info',
      title: `Privileged function: ${fn.name}()`,
      description: fn.reason,
      source: 'ChainIntel ABI Parser',
    });
  }

  // â”€â”€â”€ GoPlus security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const riskAssessment = assessTokenRisk(goplusSecurity);
  if (!goplusSecurity) {
    // GoPlus does not index all contract types (protocol contracts, bridges, permit contracts).
    // Add a soft info notice instead of a false warning flag.
    findings.push({
      id: 'goplus_unavailable',
      severity: 'info',
      title: 'GoPlus security scan not available for this contract type',
      description: 'GoPlus does not index all contracts (e.g. protocol infrastructure, bridges, Permit2-style contracts). Risk assessed from on-chain bytecode and Etherscan source code only.',
      source: 'GoPlus Security',
    });
  } else {
    for (const flag of riskAssessment.flags.slice(0, 6)) {
      findings.push({ id: `goplus_${findings.length}`, severity: 'warning', title: flag, description: flag, source: 'GoPlus Security' });
    }
  }

  // â”€â”€â”€ Deployer info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const deployer = contractCreation?.contractCreator || goplusSecurity?.creator_address || '';
  const deployTx = contractCreation?.txHash || '';
  if (deployer) evidence.push({ label: 'Deployer', value: deployer, source: 'Etherscan' });

  // â”€â”€â”€ Self-destruct check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const hasSelfDestruct = sourceCode.includes('selfdestruct') || goplusSecurity?.selfdestruct === '1';
  if (hasSelfDestruct) {
    findings.push({ id: 'selfdestruct', severity: 'critical', title: 'Contract contains selfdestruct â€” can be permanently destroyed', description: 'Owner can destroy this contract, wiping all balances.', source: 'ChainIntel' });
  }

  // â”€â”€â”€ External call risk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (goplusSecurity?.external_call === '1') {
    findings.push({ id: 'external_call', severity: 'warning', title: 'External calls detected â€” potential reentrancy risk', description: 'Contract makes external calls which could be exploited via reentrancy if not properly guarded.', source: 'GoPlus Security' });
  }

  // â”€â”€â”€ AI Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // --- Complexity score ---
  let complexityScore = 0;
  try {
    const abi = JSON.parse(abiStr) as unknown[];
    const funcCount = Array.isArray(abi) ? abi.filter((x: unknown) => (x as Record<string, string>).type === 'function').length : 0;
    complexityScore = Math.min(100, funcCount * 3);
  } catch { /* ignore */ }

  // --- Risk scoring ---
  let riskScore = 0;
  if (!isVerified) riskScore += 15;
  if (isProxy) riskScore += 10;
  if (hasSelfDestruct) riskScore += 25;
  riskScore += Math.min(30, privilegedFunctions.length * 5);
  riskScore += riskAssessment.score * 0.3;
  riskScore = Math.min(100, riskScore);

  // --- AI Summary & Deep Feedback ---
  let aiSummary: {
    summary: string;
    purpose: string;
    keyFunctions: string[];
    whyRiskScore?: string;
    whyDesignedThisWay?: string;
    securityFeedback?: string;
  } = {
    summary: '',
    purpose: '',
    keyFunctions: [],
    whyRiskScore: '',
    whyDesignedThisWay: '',
    securityFeedback: '',
  };

  if (isVerified && (sourceCode.length > 0 || abiStr.length > 0)) {
    aiSummary = await summarizeContract(contractName, sourceCode, abiStr, Math.round(riskScore), findings.map(f => f.title));
    if (aiSummary.summary) dataSources.push('Groq AI');
  }

  // --- Recommendations ---
  if (!isVerified) recommendations.push('Source code is not verified - treat with extreme caution');
  if (isProxy) recommendations.push('This is an upgradeable proxy - the behavior can change at any time. Monitor governance closely.');
  if (hasSelfDestruct) recommendations.push('Contract can self-destruct - high counterparty risk if funds are stored here');
  if (privilegedFunctions.length > 5) recommendations.push('Many privileged admin functions exist - understand who controls the owner key');
  if (isVerified && riskScore < 30) recommendations.push('Source code is verified and risk signals are low');

  const confidence = Math.min(0.95, 0.25 + dataSources.length * 0.15 + (isVerified ? 0.2 : 0));
  const purposeStr = (aiSummary.purpose && !aiSummary.purpose.includes('Unknown')) ? ` - ${aiSummary.purpose}` : '';
  // --- Generate Full Protocol Intelligence Cards (Screenshot layout) ---
  let protocolIntelligence: any = null;
  try {
    protocolIntelligence = await generateProtocolIntelligence({
      name: contractName,
      address,
      chain,
      riskScore: Math.round(riskScore),
      isVerified,
      isProxy,
      privilegedCount: privilegedFunctions.length,
      compiler,
      bytecodeLength: contractBytes ? Math.round(contractBytes.length / 2) : 0,
    });
  } catch { /* ignore */ }

  const summary = `${contractName} on ${chainConfig.name} is ${isVerified ? 'verified' : 'unverified'} with ${privilegedFunctions.length} privileged functions and ${isProxy ? 'upgradeable proxy architecture' : 'non-upgradeable bytecode'}. Risk score: ${Math.round(riskScore)}/100 (${riskScore > 65 ? 'High Risk' : riskScore > 30 ? 'Moderate Risk' : 'Low Risk'})${purposeStr}.`;

  const response = buildResponse(
    'contract/analyze',
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
      name: contractName,
      compiler,
      is_verified: isVerified,
      is_proxy: isProxy,
      proxy_type: proxyInfo.proxyType,
      implementation_address: implementationAddress || null,
      ownership_pattern: ownershipInfo.pattern,
      deployer,
      deploy_tx: deployTx,
      has_self_destruct: hasSelfDestruct,
      complexity_score: complexityScore,
      function_count: privilegedFunctions.length,
      privileged_functions: privilegedFunctions,
      ai_summary: aiSummary.summary,
      ai_purpose: aiSummary.purpose,
      ai_key_functions: aiSummary.keyFunctions,
      ai_feedback: {
        why_risk_score: aiSummary.whyRiskScore,
        why_designed_this_way: aiSummary.whyDesignedThisWay,
        security_feedback: aiSummary.securityFeedback,
      },
      security_flags: riskAssessment.flags,
      protocol_intelligence: protocolIntelligence,
    },
    start,
    false,
    dataSources,
  );

  await cache.set(cacheKey, response, 600); // 10 min cache for contracts
  return response;
}

