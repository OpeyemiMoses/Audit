// src/types/response.ts
// Canonical response schema — every ChainIntel endpoint returns this shape

export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type FindingSeverity = 'info' | 'warning' | 'critical';

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  source?: string;
}

export interface Evidence {
  label: string;
  value: string | number | boolean;
  source: string;
  url?: string;
}

export interface ResponseMetadata {
  chain: string;
  chain_id: number;
  analyzed_at: string;
  latency_ms: number;
  cached: boolean;
  data_sources: string[];
  module: string;
  version: string;
}

export interface ChainIntelResponse<T = Record<string, unknown>> {
  status: 'success' | 'error';
  module: string;
  chain: string;
  summary: string;
  risk_score: number;        // 0-100 (0 = no risk, 100 = extreme risk)
  risk_level: RiskLevel;
  confidence: number;        // 0-1 (1 = very confident)
  findings: Finding[];
  recommendations: string[];
  evidence: Evidence[];
  data: T;
  metadata: ResponseMetadata;
}

export interface ErrorResponse {
  status: 'error';
  error: string;
  message: string;
  module?: string;
  timestamp: string;
}

// Compute risk level from score
export function getRiskLevel(score: number): RiskLevel {
  if (score <= 20) return 'very_low';
  if (score <= 40) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'very_high';
}

// Build a standard response
export function buildResponse<T>(
  module: string,
  chain: string,
  chainId: number,
  summary: string,
  riskScore: number,
  confidence: number,
  findings: Finding[],
  recommendations: string[],
  evidence: Evidence[],
  data: T,
  startTime: number,
  cached: boolean,
  dataSources: string[],
): ChainIntelResponse<T> {
  const clamped = Math.min(100, Math.max(0, Math.round(riskScore)));
  return {
    status: 'success',
    module,
    chain,
    summary,
    risk_score: clamped,
    risk_level: getRiskLevel(clamped),
    confidence: Math.min(1, Math.max(0, confidence)),
    findings,
    recommendations,
    evidence,
    data,
    metadata: {
      chain,
      chain_id: chainId,
      analyzed_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
      cached,
      data_sources: dataSources,
      module,
      version: '1.0.0',
    },
  };
}
