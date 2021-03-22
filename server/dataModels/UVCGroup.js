const mongoose = require('mongoose');
const MainLogger = require('../Logger.js').logger;

const logger = MainLogger.child({ service: 'UVCGroup' });

const { Schema } = mongoose;

const uvcGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  devices: [{ type: Schema.Types.ObjectId, ref: 'UVCDevice' }],
  alarmState: { type: Boolean, default: false },
  engineState: { type: Boolean, default: false },
  engineStateDevicesWithOtherState: [{ type: Schema.Types.ObjectId, ref: 'UVCDevice' }],
  eventMode: { type: Boolean, default: false },
  eventModeDevicesWithOtherState: [{ type: Schema.Types.ObjectId, ref: 'UVCDevice' }],
  engineLevel: { type: Number, default: 0 },
  engineLevelDevicesWithOtherState: [{ type: Schema.Types.ObjectId, ref: 'UVCDevice' }],
});
const uvcGroupModel = mongoose.model('UVCGroup', uvcGroupSchema);

async function getDevicesWithWrongState(group, prop, db) {
  return group.devices.filter((dev) => dev[prop] !== group[prop]);
}

/**
 * Updates the list of devices that do not have the same state of the given
 * propertie that the group they belong to
 * @param {Object} database Database object
 * @param {String} groupID The group id of which the lists should be updated
 * @param {String} prop The propertie of which the list should be updated
 * @param {Array} devicesWrongState Array of serialnumbers of the devices
 */
async function updateGroupDevicesWithOtherState(database, groupID, prop, devicesWrongState) {
  logger.debug('updateGroup %s devices with other state for prop %s', groupID, prop);
  switch (prop) {
    case 'engineState':
      return database.updateGroupDevicesWithOtherState(groupID, 'engineState', devicesWrongState);
    case 'engineLevel':
      return database.updateGroupDevicesWithOtherState(groupID, 'engineLevel', devicesWrongState);
    case 'eventMode':
      return database.updateGroupDevicesWithOtherState(groupID, 'eventMode', devicesWrongState);
    default:
      throw new Error(`Can not update group state with propertie ${prop}`);
  }
}

async function updateGroupStates(groupID, prop, db, io) {
  logger.debug('updateGroup states');
  let group = await db.getGroup(groupID);
  const devicesWrongState = await getDevicesWithWrongState(group, prop, db);
  const serialnumbers = [];
  devicesWrongState.forEach((device) => {
    serialnumbers.push(device.serialnumber);
  });

  switch (prop) {
    case 'engineState':
      await updateGroupDevicesWithOtherState(db, groupID, prop, serialnumbers);
      group = await db.getGroup(groupID);

      io.emit('group_devicesWithOtherStateChanged', {
        id: groupID,
        prop: `${prop}DevicesWithOtherState`,
        newValue: group[`${prop}DevicesWithOtherState`],
      });
      break;
    case 'engineLevel':
      await updateGroupDevicesWithOtherState(db, groupID, prop, serialnumbers);
      group = await db.getGroup(groupID);

      io.emit('group_devicesWithOtherStateChanged', {
        id: groupID,
        prop: `${prop}DevicesWithOtherState`,
        newValue: group[`${prop}DevicesWithOtherState`],
      });
      break;
    case 'eventMode':
      await updateGroupDevicesWithOtherState(db, groupID, prop, serialnumbers);
      group = await db.getGroup(groupID);

      io.emit('group_devicesWithOtherStateChanged', {
        id: groupID,
        prop: `${prop}DevicesWithOtherState`,
        newValue: group[`${prop}DevicesWithOtherState`],
      });
      break;
    default:
      logger.debug('Can not update group state with propertie %s', prop);
      break;
  }
}

function checkAlarmState(group) {
  const deviceStates = group.devices.filter((device) => device.alarmState === true);
  if (deviceStates.length !== 0) {
    return true;
  }
  return false;
}

module.exports = {
  updateGroupStates,
  checkAlarmState,
  getDevicesWithWrongState,
  updateGroupDevicesWithOtherState,
  uvcGroupModel,
};
