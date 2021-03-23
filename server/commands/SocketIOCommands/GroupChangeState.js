const MainLogger = require('../../Logger.js').logger;
const UVCGroup = require('../../dataModels/UVCGroup');
const ChangeState = require('../MQTTCommands/ChangeState');

const logger = MainLogger.child({ service: 'GroupChangeStateCommand' });

async function execute(db, io, mqtt, message) {
  if (message.id === undefined || typeof message.id !== 'string') {
    throw new Error('id must be defined and of type string');
  }

  if (message.prop === undefined || typeof message.prop !== 'string') {
    throw new Error('Prop must be defined and of type string');
  }

  if (message.newValue === undefined || typeof message.newValue !== 'string') {
    throw new Error('New value must be defined and of type string');
  }

  const newState = {
    id: message.id,
    prop: message.prop,
    newValue: message.newValue,
  };

  let group = null;

  switch (newState.prop) {
    case 'name':
      group = await db.updateGroup({
        id: `${newState.id}`,
        name: newState.newValue,
      });
      if (group.name === newState.newValue) {
        logger.debug('name of group %s updated, sending group_stateChanged with prop name and new name as %s', newState.id, newState.newValue);
        io.emit('group_stateChanged', {
          id: newState.id,
          prop: newState.prop,
          newValue: newState.newValue,
        });
        return {};
      }
      throw new Error('The name of group %s has not been updated', newState.id);
    case 'engineState':
      await db.updateGroup({
        id: `${newState.id}`,
        engineState: newState.newValue,
      });
      break;
    case 'engineLevel':
      await db.updateGroup({
        id: `${newState.id}`,
        engineLevel: newState.newValue,
      });
      break;
    case 'eventMode':
      await db.updateGroup({
        id: `${newState.id}`,
        eventMode: newState.newValue,
      });
      break;
    default:
      throw new Error(`GroupChangeState is not implementet for propertie ${newState.prop}`);
  }
  const setting = await db.getSetting('UVCServerSetting');

  await UVCGroup.updateGroupStates(newState.id.toString(), newState.prop, db, io);

  group = await db.getGroup(newState.id.toString());

  await Promise.all(group.devices.map(async (device) => {
    logger.debug('sending mqtt message for device %s, changeState with propertie %s and value %s', device.serialnumber, newState.prop, newState.newValue);
    await ChangeState.execute(setting, mqtt, device.serialnumber, newState.prop, newState.newValue);
  }));

  if (newState.prop === 'engineState' && newState.newValue === 'true') {
    await Promise.all(group.devices.map(async (device) => {
      logger.debug('Device is turning on, sending change engineLevel state to with value %s', device.serialnumber, device.engineLevel);
      await ChangeState.execute(setting, mqtt, device.serialnumber, 'engineLevel', device.engineLevel.toString());
    }));
  }

  io.emit('group_stateChanged', {
    id: newState.id,
    prop: newState.prop,
    newValue: newState.newValue,
  });

  io.emit('info', { message: `Sended changeState (${newState.prop}) MQTT message to device in group ${newState.id}` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('group_changeState', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'GroupChangeStateCommand', error: e });
    }
  });
};
