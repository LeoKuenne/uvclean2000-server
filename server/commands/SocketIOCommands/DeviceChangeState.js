const MainLogger = require('../../Logger.js').logger;
const ChangeState = require('../MQTTCommands/ChangeState');

const logger = MainLogger.child({ service: 'DeviceChangeStateCommand' });

function execute(db, io, mqtt, message) {
  logger.info('Event: device_changeState: %o', message);

  if (message.serialnumber === undefined || typeof message.serialnumber !== 'string') {
    throw new Error('Serialnumber must be defined and of type string');
  }

  if (message.prop === undefined || typeof message.prop !== 'string') {
    throw new Error('Prop must be defined and of type string');
  }

  if (message.newValue === undefined || typeof message.newValue !== 'string') {
    throw new Error('New value must be defined and of type string');
  }

  const newState = {
    serialnumber: message.serialnumber,
    prop: message.prop,
    newValue: message.newValue,
  };

  switch (newState.prop) {
    case 'engineState':
      newState.prop = 'engineState';
      break;
    case 'name':
      newState.prop = 'name';
      break;
    case 'eventMode':
      newState.prop = 'eventMode';
      break;
    case 'engineLevel':
      newState.prop = 'engineLevel';
      break;
    default:
      throw new Error(`Can not parse state ${newState.prop} for MQTT`);
  }

  return newState;
}

/**
 *
 * @param {UVCleanServer} server The main server
 * @param {MongoDBAdapter} db The MongoDBAdapter
 * @param {socketio} io socket io socketio server
 * @param {mqtt} mqtt mqtt Client
 * @param {socketio.Socket} ioSocket sockt of socketio connection
 */
module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('device_changeState', async (message) => {
    try {
      const newState = execute(db, io, mqtt, message);
      const setting = await db.getSetting('UVCServerSetting');
      const device = await db.getDevice(newState.serialnumber);

      await ChangeState.execute(setting, mqtt, newState.serialnumber, newState.prop,
        newState.newValue);

      if (config.mqtt.sendEngineLevelWhenOn && newState.prop === 'engineState' && newState.newValue === 'true') {
        logger.debug('Device is turning on, sending change engineLevel state to with value %s', device.serialnumber, device.engineLevel);
        await ChangeState.execute(setting, mqtt, newState.serialnumber, 'engineLevel', device.engineLevel.toString());
      }

      io.emit('info', { service: 'DeviceChangeStateCommand', message: `Sended changeState (${newState.prop}) MQTT message to device ${newState.serialnumber}` });
    } catch (e) {
      server.emit('error', { service: 'DeviceChangeStateCommand', error: e });
    }
  });
};
