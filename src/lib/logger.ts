// src/lib/logger.ts
import winston from 'winston';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format:
    process.env.NODE_ENV === 'production'
      ? combine(timestamp(), json())
      : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
  transports: [new winston.transports.Console({ stderrLevels: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'] })],
});

export default logger;
