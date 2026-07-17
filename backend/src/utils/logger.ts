import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message} `;
  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }
  return msg;
});

export const logger = winston.createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
  ),
  transports: [
    new winston.transports.Console({
      format: config.nodeEnv === 'development'
        ? winston.format.combine(winston.format.colorize(), logFormat)
        : winston.format.json(),
    }),
  ],
});
