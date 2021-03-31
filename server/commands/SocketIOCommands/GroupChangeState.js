const MainLogger = require('../../Logger.js').logger;
const UVCGroup = require('../../dataModels/UVCGroup');
const MQTTGroupChangeState = require('../MQTTCommands/MQTTGroupChangeState');

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

  let dbGroup = null;
  switch (newState.prop) {
    case 'name':
      dbGroup = await db.updateGroup({
        id: `${newState.id}`,
        name: newState.newValue,
      });
      if (dbGroup.name === newState.newValue) {
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

  dbGroup = await UVCGroup.updateGroupDevicesWithOtherState(newState.id.toString(), newState.prop,
    db, io);

  await MQTTGroupChangeState.execute(mqtt, dbGroup, newState.prop, newState.newValue);

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
