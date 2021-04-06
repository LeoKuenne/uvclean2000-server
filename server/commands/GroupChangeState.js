const MainLogger = require('../Logger.js').logger;
const MQTTGroupChangeState = require('./MQTTCommands/MQTTGroupChangeState');
const UVCGroup = require('../dataModels/UVCGroup');

const logger = MainLogger.child({ service: 'GroupChangeStateCommand' });

async function execute(db, io, mqtt, groupID, propertie, newValue) {
  let dbGroup = null;
  switch (propertie) {
    case 'name':
      dbGroup = await db.updateGroup({
        id: `${groupID}`,
        name: newValue,
      });
      if (dbGroup.name === newValue) {
        logger.debug('name of group %s updated, sending group_stateChanged with prop name and new name as %s', groupID, newValue);
        io.emit('group_stateChanged', {
          id: groupID,
          prop: propertie,
          newValue,
        });
        return {};
      }
      throw new Error('The name of group %s has not been updated', groupID);
    case 'engineState':
      await db.updateGroup({
        id: `${groupID}`,
        engineState: newValue,
      });
      break;
    case 'engineLevel':
      await db.updateGroup({
        id: `${groupID}`,
        engineLevel: newValue,
      });
      break;
    case 'eventMode':
      await db.updateGroup({
        id: `${groupID}`,
        eventMode: newValue,
      });
      break;
    default:
      throw new Error(`GroupChangeState is not implementet for propertie ${propertie}`);
  }

  dbGroup = await UVCGroup.updateGroupDevicesWithOtherState(groupID.toString(), propertie,
    db, io);

  await MQTTGroupChangeState.execute(mqtt, dbGroup, propertie, newValue);

  io.emit('group_stateChanged', {
    id: groupID,
    prop: propertie,
    newValue,
  });

  io.emit('info', { message: `Sended changeState (${propertie}) MQTT message to device in group ${groupID}` });
}

module.exports = {
  execute,
};
