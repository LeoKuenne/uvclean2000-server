const MainLogger = require('../../Logger.js').logger;
const { encrypt } = require('./middleware/encrypt');

const logger = MainLogger.child({ service: 'DeviceChangeStateCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: device_changeState: %o', message);

  if (message.serialnumber !== undefined && typeof message.serialnumber !== 'string') {
    throw new Error('Serialnumber must be defined and of type string');
  }

  if (message.prop !== undefined && typeof message.prop !== 'string') {
    throw new Error('Prop must be defined and of type string');
  }

  if (message.newValue !== undefined && typeof message.newValue !== 'string') {
    throw new Error('New value must be defined and of type string');
  }

  const newState = {
    serialnumber: message.serialnumber,
    prop: message.prop,
    newValue: message.newValue,
  };
  const encryptedValue = encrypt(newState.newValue);

  let propertie = '';
  switch (newState.prop) {
    case 'engineState':
      propertie = 'engineState';
      break;
    case 'name':
      propertie = 'name';
      break;
    case 'eventMode':
      propertie = 'eventMode';
      break;
    case 'engineLevel':
      propertie = 'engineLevel';
      break;
    default:
      throw new Error(`Can not parse state ${newState.prop} for MQTT`);
  }

  logger.debug('sending mqtt message for device %s, changeState with propertie %s and value %s', newState.serialnumber, propertie, newState.newValue);

  mqtt.publish(`UVClean/${newState.serialnumber}/changeState/${propertie}`, (config.mqtt.useEncryption) ? encryptedValue : newState.newValue);
  io.emit('info', { message: `Sended changeState (${propertie}) MQTT message to device ${newState.serialnumber}` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('device_changeState', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'DeviceChangeStateCommand', error: e });
    }
  });
};
