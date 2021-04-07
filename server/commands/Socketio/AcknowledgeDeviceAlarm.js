const MainLogger = require('../../Logger.js').logger;
const MQTTCommand = require('../MQTTCommands/MQTTCommand');

const logger = MainLogger.child({ service: 'AcknowledgeDeviceAlarmCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: device_acknowledgeAlarm: %o', message);

  if (message.serialnumber !== undefined && typeof message.serialnumber !== 'string') {
    throw new Error('Serialnumber must be defined and of type string');
  }

  const dbDevice = await db.getDevice(message.serialnumber);
  logger.debug('Sending device acknowledge alarm mqtt message');

  await MQTTCommand.execute(mqtt, dbDevice.serialnumber, 'acknowledge', true);

  io.emit('info', { message: `Acknowledgement send to device ${dbDevice.serialnumber}` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('device_acknowledgeAlarm', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'AcknowledgeDeviceAlarmCommand', error: e });
    }
  });
};
