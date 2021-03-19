const winston = require('winston');

const {
  combine, colorize, timestamp, errors, splat, metadata, printf, json,
} = winston.format;

const errorFormat = printf((info) => {
  const log = `${info.timestamp} [${info.metadata.service}] ${info.level}:`;
  return (config.logging.consoleErrorStack && info.metadata.stack)
    ? `${log} ${info.message}\n${info.metadata.stack}` : `${log} ${info.message}`;
});

const normalFormat = printf((info) => `${info.timestamp} [${info.metadata.service}] ${info.level}: ${info.message}`);

const logger = winston.createLogger({
  transports: [new winston.transports.Console({
    level: 'info',
    format: combine(
      colorize(),
      timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      errors({ stack: false }),
      splat(),
      metadata(),
      normalFormat,
    ),
  })],
});

function setTransports() {
  logger.clear();

  const d = Date.now();
  if (config.logging.file) {
    logger.add(new winston.transports.File({
      format: combine(
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        errors({ stack: true }),
        splat(),
        metadata(),
        json(),
      ),
      filename: `logs/error/${d}.log`,
      level: 'error',
    }));
    logger.add(new winston.transports.File({
      format: combine(
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        errors({ stack: true }),
        splat(),
        metadata(),
        json(),
      ),
      filename: `logs/combined/${d}.log`,
      level: config.logging.fileLogLevel,
    }));
  }
  if (config.logging.console) {
    logger.add(new winston.transports.Console({
      level: config.logging.consoleLogLevel,
      format: combine(
        metadata(),
        colorize(),
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        errors({ stack: config.logging.consoleErrorStack }),
        splat(),
        errorFormat,
      ),
    }));
  }
}

module.exports = { logger, setTransports };
