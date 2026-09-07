// src/modules/decision/evaluate.ts
import { z } from 'zod';
import { getChainConfig } from '../../types/chains.js';
import { buildResponse, Finding, Evidence } from '../../types/response.js';
import { runDecisionEngine } from '../../adapters/groq.js';
import logger from '../../lib/logger.js';

export const DecisionEvaluateSchema = z.object({
  context: z.string().min(5, 'Describe what you are evaluating'),
  findings: z.array(z.string()).optional().default([]),
  risk_score: z.number().min(0).max(100).optional(),
  chain: z.string().default('ethereum'),
  question: z.string().optional(),
  // Allow passing previous module responses directly
  module_response: z.record(z.unknown()).optional(),
});

export type DecisionEvaluateInput = z.infer<typeof DecisionEvaluateSchema>;

export async function evaluateDecision(input: DecisionEvaluateInput) {
  const start = Date.now();
  const { context, chain, question } = input;
  const chainConfig = getChainConfig(chain);

  logger.info('[decision/evaluate] Starting', { context: context.slice(0, 60) });

  // If a module_response was passed, extract findings from it
  let allFindings = [...(input.findings || [])];
  let riskScore = input.risk_score ?? 50;

  if (input.module_response) {
    const mr = input.module_response as Record<string, unknown>;
    if (typeof mr.risk_score === 'number') riskScore = mr.risk_score;
    if (Array.isArray(mr.findings)) {
      const moduleFindingTexts = (mr.findings as Array<{ title: string }>)
        .map(f => f.title)
        .filter(Boolean);
      allFindings = [...allFindings, ...moduleFindingTexts];
    }
    if (Array.isArray(mr.recommendations)) {
      allFindings = [...allFindings, ...(mr.recommendations as string[])];
    }
    if (typeof mr.summary === 'string' && mr.summary) {
      allFindings.unshift(`Summary: ${mr.summary}`);
    }
  }

  // Run AI decision engine
  const decision = await runDecisionEngine({
    context,
    findings: allFindings,
    riskScore,
    userQuestion: question,
  });

  const evidences: Evidence[] = [
    { label: 'Input risk score', value: riskScore, source: 'Provided' },
    { label: 'Findings analyzed', value: allFindings.length, source: 'ChainIntel' },
    { label: 'AI recommendation', value: decision.recommendation, source: 'Groq AI' },
    { label: 'AI confidence', value: `${(decision.confidence * 100).toFixed(0)}%`, source: 'Groq AI' },
  ];

  const findings: Finding[] = [
    ...decision.keyRisks.map((r, i) => ({
      id: `risk_${i}`,
      severity: 'warning' as const,
      title: r,
      description: r,
      source: 'Groq AI Decision Engine',
    })),
  ];

  const summary = `Decision Engine: ${decision.recommendation.replace(/_/g, ' ')} (confidence: ${(decision.confidence * 100).toFixed(0)}%) — ${decision.tradeoffs.slice(0, 120)}`;

  return buildResponse(
    'decision/evaluate',
    chain,
    chainConfig.id,
    summary,
    riskScore,
    decision.confidence,
    findings,
    decision.suggestedNextSteps,
    evidences,
    {
      context,
      recommendation: decision.recommendation,
      confidence: decision.confidence,
      key_risks: decision.keyRisks,
      key_strengths: decision.keyStrengths,
      tradeoffs: decision.tradeoffs,
      suggested_next_steps: decision.suggestedNextSteps,
      disclaimer: decision.disclaimer,
      ai_model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    },
    start,
    false,
    ['Groq AI'],
  );
}
