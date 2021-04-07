const MainLogger = require('../Logger.js').logger;
const MQTTDeviceChangeState = require('./MQTTCommands/MQTTDeviceChangeState');
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

  await Promise.all(dbGroup.devices.map(async (device) => {
    await MQTTDeviceChangeState.execute(mqtt, device.serialnumber, propertie, newValue);
  }));

  if (global.config.mqtt.sendEngineLevelWhenOn && propertie === 'engineState' && newValue === 'true') {
    dbGroup.devices.map((device) => {
      logger.debug('Device is turning on, sending extra changeState engineLevel');
      setTimeout(async () => {
        await MQTTDeviceChangeState.execute(mqtt, device.serialnumber, 'engineLevel', device.engineLevel.toString());
      }, global.config.mqtt.sendEngineLevelWhenOnDelay * 1000);
      return device;
    });
  }

  io.emit('group_stateChanged', {
    id: groupID,
    prop: propertie,
    newValue,
  });

  io.emit('info', { message: `Sended changeState (${propertie}) MQTT message to device in group ${groupID}` });
  return {};
}

module.exports = {
  execute,
};
