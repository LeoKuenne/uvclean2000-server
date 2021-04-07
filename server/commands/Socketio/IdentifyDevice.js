const MainLogger = require('../../Logger.js').logger;
const { encrypt } = require('../MQTTCommands/middleware/encrypt');

const logger = MainLogger.child({ service: 'IdentifyDevice' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: device_identify: %o', message);

  if (message.serialnumber !== undefined && typeof message.serialnumber !== 'string') {
    throw new Error('Serialnumber must be defined and of type string');
  }
  const encryptedValue = await encrypt('true');

  await db.getDevice(message.serialnumber)
    .catch((e) => {
      throw e;
    }).then((databaseDevice) => {
      logger.debug('Sending device identify mqtt message for device %s', databaseDevice.serialnumber);

      mqtt.publish(`UVClean/${databaseDevice.serialnumber}/identify`, (config.mqtt.useEncryption) ? encryptedValue : 'true');
      io.emit('info', { message: `Identify send to device ${databaseDevice.serialnumber}` });
    });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('device_identify', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'IdentifyDevice', error: e });
    }
  });
};
