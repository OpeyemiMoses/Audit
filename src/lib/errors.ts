// src/lib/errors.ts

export class ChainIntelError extends Error {
  public readonly statusCode: number;
  public readonly module?: string;

  constructor(message: string, statusCode = 500, module?: string) {
    super(message);
    this.name = 'ChainIntelError';
    this.statusCode = statusCode;
    this.module = module;
  }
}

export class InvalidInputError extends ChainIntelError {
  constructor(message: string, module?: string) {
    super(message, 400, module);
    this.name = 'InvalidInputError';
  }
}

export class DataSourceError extends ChainIntelError {
  constructor(source: string, detail?: string) {
    super(`Data source error [${source}]${detail ? ': ' + detail : ''}`, 502);
    this.name = 'DataSourceError';
  }
}

export class RateLimitError extends ChainIntelError {
  constructor(source: string) {
    super(`Rate limit reached for ${source}. Retry after a moment.`, 429);
    this.name = 'RateLimitError';
  }
}

export class UnsupportedChainError extends ChainIntelError {
  constructor(chain: string) {
    super(`Chain "${chain}" is not supported. Use: ethereum, base, or xlayer`, 400);
    this.name = 'UnsupportedChainError';
  }
}

export class NotFoundError extends ChainIntelError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}
