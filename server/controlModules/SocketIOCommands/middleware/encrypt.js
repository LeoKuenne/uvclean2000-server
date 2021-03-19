const fs = require('fs');
const fernet = require('fernet');
const MainLogger = require('../../../Logger.js').logger;

const logger = MainLogger.child({ service: 'EncryptMiddleware' });

function encrypt(msg) {
  logger.debug(`Encrypting ${msg}`);
  const secret = fernet.setSecret(fs.readFileSync(config.mqtt.secret, { encoding: 'base64' }));
  const token = new fernet.Token({
    secret,
  });
  const message = token.encode(msg);

  if (message === msg) throw new Error(`Could not encode ${message}`);

  return message;
}

module.exports = {
  encrypt,
};
