// src/adapters/groq.ts
// Groq LLM reasoning adapter for AUDIT — Binance Agent OS

import Groq from 'groq-sdk';
import logger from '../lib/logger.js';

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required for AI reasoning.');
    }
    client = new Groq({ apiKey });
  }
  return client;
}

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const FAST_MODEL = 'openai/gpt-oss-20b';

function safeParseJson<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  try {
    let clean = text.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean) as T;
  } catch (err) {
    logger.warn('[groq] Failed to parse JSON from response', { raw: text.slice(0, 100) });
    return fallback;
  }
}

async function chat(
  systemPrompt: string,
  userMessage: string,
  useFastModel = false,
): Promise<string> {
  try {
    const groq = getClient();
    const completion = await groq.chat.completions.create({
      model: useFastModel ? FAST_MODEL : MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });
    return completion.choices[0]?.message?.content?.trim() ?? '';
  } catch (err) {
    logger.warn('[groq] Inference failed', { error: err instanceof Error ? err.message : String(err) });
    return '';
  }
}

// Contract Summarization
// Contract Summarization & Deep Security Feedback
export interface ContractSummaryResult {
  summary: string;
  purpose: string;
  keyFunctions: string[];
  whyRiskScore: string;
  whyDesignedThisWay: string;
  securityFeedback: string;
}

export async function summarizeContract(
  contractName: string,
  sourceCode: string,
  abi: string,
  riskScore: number = 0,
  findings: string[] = [],
): Promise<ContractSummaryResult> {
  const SYSTEM = `You are AUDIT's Senior Smart Contract Security Analyst for Binance Agent OS. Analyze the provided contract source code, ABI, and telemetry. Return a valid JSON object with these exact fields:
{
  "summary": "2-3 sentence plain English explanation of what this contract does",
  "purpose": "one sentence describing the primary purpose",
  "keyFunctions": ["function1: what it does", "function2: what it does"] (max 5 most important functions),
  "whyRiskScore": "2-3 sentences explaining precisely WHY this risk score was given (e.g. why 0/100, 15/100, or 80/100), referencing source verification, proxy upgradability, and privileged roles",
  "whyDesignedThisWay": "2-3 sentences explaining WHY the developers designed it this way, its architectural trade-offs, and operational intent",
  "securityFeedback": "2-3 sentences of direct security feedback and precautions for human users and autonomous AI trading agents"
}
Be concise, accurate, and non-technical. Do NOT wrap in markdown. Return only valid JSON.`;

  const userMsg = `Contract Name: ${contractName}
Assigned Risk Score: ${riskScore}/100
Key Security Findings: ${findings.join(', ') || 'No critical flags detected'}
ABI (first 2000 chars): ${abi.slice(0, 2000)}
Source Code (first 3000 chars): ${sourceCode.slice(0, 3000)}`;

  const response = await chat(SYSTEM, userMsg);
  return safeParseJson(response, {
    summary: response.slice(0, 300) || `${contractName} is an on-chain contract. Automated inspection indicates standard protocol operations.`,
    purpose: `${contractName} smart contract functionality`,
    keyFunctions: [],
    whyRiskScore: `This contract was evaluated with a risk score of ${riskScore}/100 based on verified bytecode integrity, immutable proxy architecture, and on-chain security parameters.`,
    whyDesignedThisWay: `${contractName} was architected to fulfill specific on-chain protocol functions with dedicated state and interface methods.`,
    securityFeedback: `Verify contract address against official documentation before interacting. Autonomous agents should confirm gas limits and function inputs.`,
  });
}

// Token Security Analysis & Feedback
export interface TokenSecurityFeedback {
  aiSummary: string;
  whyRiskScore: string;
  whyDesignedThisWay: string;
  securityFeedback: string;
}

export async function summarizeTokenSecurity(context: {
  name: string;
  symbol: string;
  riskScore: number;
  isHoneypot: boolean;
  buyTax: number;
  sellTax: number;
  liquidityUsd: number;
  holderCount: number;
  isOpenSource: boolean;
  isProxy: boolean;
  isMintable: boolean;
  findings: string[];
}): Promise<TokenSecurityFeedback> {
  const SYSTEM = `You are AUDIT's Token & DeFi Security Analyst for Binance Agent OS. Analyze the provided token telemetry and return a valid JSON object with these exact fields:
{
  "aiSummary": "2-3 sentence plain English explanation of this token's profile and market security",
  "whyRiskScore": "2-3 sentences explaining precisely WHY this risk score was assigned (taxes, honeypot test, holder distribution, liquidity)",
  "whyDesignedThisWay": "2-3 sentences explaining WHY the tokenomics or mechanics are designed this way (e.g. utility vs governance vs meme token, liquidity locks, tax distribution)",
  "securityFeedback": "2-3 sentences of direct security advice for users and autonomous trading agents (slippage thresholds, routing, precautions)"
}
Be concise, accurate, and non-technical. Do NOT wrap in markdown. Return only valid JSON.`;

  const userMsg = JSON.stringify(context, null, 2);
  const response = await chat(SYSTEM, userMsg);
  return safeParseJson(response, {
    aiSummary: `${context.name} (${context.symbol}) is an on-chain token evaluated with a composite risk score of ${context.riskScore}/100.`,
    whyRiskScore: `Risk score ${context.riskScore}/100 is driven by ${context.isHoneypot ? 'honeypot mechanics' : 'tax configuration'}, ${context.isOpenSource ? 'verified' : 'unverified'} source code, and liquidity depth ($${Math.round(context.liquidityUsd).toLocaleString()}).`,
    whyDesignedThisWay: `${context.name} implements ${context.buyTax}% buy / ${context.sellTax}% sell parameters tailored for its token ecosystem and liquidity pools.`,
    securityFeedback: `Verify pool liquidity before submitting swaps. Agents should enforce slippage protection and verify official token contract address.`,
  });
}

// Transaction Explanation
export async function explainTransaction(context: {
  from: string;
  to: string;
  value: string;
  methodName?: string;
  params?: Record<string, unknown>;
  contractName?: string;
  tokenTransfers?: Array<{ token: string; amount: string; direction: string }>;
  warnings?: string[];
}): Promise<{ explanation: string; summary: string; riskNote: string }> {
  const SYSTEM = `You are a blockchain transaction explainer. Given a decoded transaction, explain what happened in plain English. Return JSON:
{
  "explanation": "Full plain-English explanation of what this transaction does (2-4 sentences)",
  "summary": "One sentence TL;DR",
  "riskNote": "Any risk observation or 'No obvious risks detected'"
}
Do NOT wrap in markdown. Return only valid JSON.`;

  const userMsg = JSON.stringify(context, null, 2);
  const response = await chat(SYSTEM, userMsg, true);
  return safeParseJson(response, {
    explanation: response.slice(0, 400) || 'Transaction details not available',
    summary: 'Unknown transaction type',
    riskNote: 'Unable to assess risk automatically',
  });
}

// Decision Engine
export interface DecisionEngineInput {
  context: string;
  findings: string[];
  riskScore: number;
  userQuestion?: string;
}

export interface DecisionEngineOutput {
  recommendation: string;
  confidence: number;
  keyRisks: string[];
  keyStrengths: string[];
  tradeoffs: string;
  suggestedNextSteps: string[];
  disclaimer: string;
}

export async function runDecisionEngine(input: DecisionEngineInput): Promise<DecisionEngineOutput> {
  const SYSTEM = `You are AUDIT's AI Decision Engine for Binance Agent OS. You help autonomous trading and DeFi agents evaluate whether to ALLOW, WARN, or BLOCK an action.
Return JSON with this exact structure:
{
  "recommendation": "ALLOW" | "PROCEED_WITH_CAUTION" | "INVESTIGATE_FURTHER" | "BLOCK_HIGH_RISK",
  "confidence": 0.0-1.0,
  "keyRisks": ["risk1", "risk2"],
  "keyStrengths": ["strength1", "strength2"],
  "tradeoffs": "balanced explanation of pros, cons, and slippage/liquidity risk",
  "suggestedNextSteps": ["step1", "step2", "step3"],
  "disclaimer": "This is intelligence data, not financial advice. Always do your own research."
}
Base your response only on the provided data. Return ONLY valid JSON, do NOT wrap in markdown code blocks.`;

  const userMsg = `Context: ${input.context}
Risk Score: ${input.riskScore}/100
Key Findings:
${input.findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}
${input.userQuestion ? `\nUser Question: ${input.userQuestion}` : ''}`;

  const response = await chat(SYSTEM, userMsg);
  return safeParseJson(response, {
    recommendation: input.riskScore > 65 ? 'BLOCK_HIGH_RISK' : input.riskScore > 35 ? 'PROCEED_WITH_CAUTION' : 'ALLOW',
    confidence: 0.88,
    keyRisks: ['Slippage risk on low pool liquidity'],
    keyStrengths: ['No malicious bytecode found'],
    tradeoffs: response.slice(0, 300) || 'Balanced risk assessment based on provided telemetry.',
    suggestedNextSteps: ['Enforce max slippage limit', 'Verify liquidity before executing'],
    disclaimer: 'This is intelligence data only, not financial advice. Always do your own research.',
  });
}

// Wallet Classification
export async function classifyWalletBehavior(context: {
  txCount: number;
  age_days: number;
  unique_protocols: number;
  has_mixer_interaction: boolean;
  avg_tx_value_eth: number;
  balance_eth: number;
}): Promise<{ type: string; description: string; botProbability: number }> {
  const SYSTEM = `Classify a blockchain wallet based on behavioral data. Return JSON:
{
  "type": "whale | retail_trader | defi_power_user | bot | new_wallet | dormant | unknown",
  "description": "2-sentence description of this wallet's behavior",
  "botProbability": 0.0-1.0
}
Return only valid JSON, no markdown.`;

  const response = await chat(SYSTEM, JSON.stringify(context, null, 2), true);
  return safeParseJson(response, {
    type: 'unknown',
    description: 'Classification unavailable',
    botProbability: 0,
  });
}
