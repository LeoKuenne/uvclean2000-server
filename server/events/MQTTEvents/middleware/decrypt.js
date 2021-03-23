const fs = require('fs');
const fernet = require('fernet');
const MainLogger = require('../../../Logger.js').logger;

const logger = MainLogger.child({ service: 'DecryptMiddleware' });

async function decrypt(server, db, io, mqtt, msg, next) {
  logger.info(`Decrypting ${msg.message}`);
  const secret = fernet.setSecret(fs.readFileSync(config.mqtt.secret, { encoding: 'base64' }));
  const token = new fernet.Token({
    secret,
    token: msg.message,
    ttl: (config.mqtt.useTTL) ? config.mqtt.ttl : 0,
  });
  const message = token.decode();

  if (message === msg.message) throw new Error(`Could not decode ${message}`);
  msg.message = message;

  await next();
}

module.exports = {
  decrypt,
};
