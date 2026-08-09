// src/utils/logger.js

const pino = require('pino');
const env = require('../config/env');

const pinoInstance = pino({
  level: env.logLevel || 'info',
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
});

function info(message, meta) {
  pinoInstance.info(meta !== undefined ? { meta } : undefined, message);
}

function warn(message, meta) {
  pinoInstance.warn(meta !== undefined ? { meta } : undefined, message);
}

function error(message, err) {
  if (err instanceof Error) {
    pinoInstance.error({ err }, message);
  } else if (err !== undefined) {
    pinoInstance.error({ meta: err }, message);
  } else {
    pinoInstance.error(message);
  }
}

module.exports = { info, warn, error, pinoInstance };