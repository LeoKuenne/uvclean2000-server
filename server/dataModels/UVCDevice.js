const mongoose = require('mongoose');
const MainLogger = require('../Logger').logger;

const logger = MainLogger.child({ service: 'UVCDeviceDataModel' });

const { Schema } = mongoose;

const uvcDeviceSchema = new mongoose.Schema({
  serialnumber: {
    type: String,
    required: true,
    validate: {
      validator: (v) => /[0-9]/.test(v),
      message: (props) => `${props.value} is not a valid serialnumber!`,
    },
  },
  name: { type: String, default: 'UVCClean Gerät' },
  group: { type: Schema.Types.ObjectId, ref: 'UVCGroup' },
  engineState: { type: Boolean, default: false },
  engineLevel: { type: Number, default: 0 },
  alarmState: { type: Boolean, default: false },
  currentBodyState: { type: Schema.Types.ObjectId, ref: 'BodyState' },
  currentFanState: { type: Schema.Types.ObjectId, ref: 'FanState' },
  currentLampState: [{ type: Schema.Types.ObjectId, ref: 'AlarmState' }],
  currentLampValue: [{ type: Schema.Types.ObjectId, ref: 'LampValue' }],
  currentFanVoltage: { type: Schema.Types.ObjectId, ref: 'FanVoltage' },
  currentCO2: { type: Schema.Types.ObjectId, ref: 'CO2' },
  currentTVOC: { type: Schema.Types.ObjectId, ref: 'TVOC' },
  eventMode: { type: Boolean, default: false },
  tacho: { type: Schema.Types.ObjectId, ref: 'Tacho' },
  currentAirVolume: { type: Schema.Types.ObjectId, ref: 'AirVolume' },
});
const uvcDeviceModel = mongoose.model('UVCDevice', uvcDeviceSchema);

/**
 * Checks wether the current device' properties for an alarm
 * @param {Object} device database device object
 * @returns {Boolean} Wether the device has an alarm
 */
function checkAlarmState(device) {
  const lampStates = device.currentLampState.filter((state) => state.state.toLowerCase() === 'alarm');
  if (lampStates.length !== 0
      || device.currentFanState.state.toLowerCase() === 'alarm'
      || device.currentBodyState.state.toLowerCase() === 'alarm') {
    return true;
  }
  return false;
}

function parseStates(propertie, subpropertie, value) {
  logger.debug(`parsingState for propertie ${propertie}, subpropertie ${subpropertie} and Value ${value}`);
  switch (propertie) {
    case 'name':
    case 'currentBodyState':
    case 'currentFanState':
      return { value: `${value}` };
    case 'engineState':
    case 'eventMode':
      return { value: (`${value}` === 'true') };
    case 'currentFanVoltage':
      return { value: parseFloat(value) };
    case 'tacho':
    case 'currentAirVolume':
    case 'engineLevel':
      return { value: parseInt(value, 10) };
    case 'currentCO2':
      return { value: parseInt(value, 10) };
    case 'currentTVOC':
      return { value: parseInt(value, 10) };
    case 'currentLampState':
      return {
        value: `${value}`,
        lamp: parseInt(subpropertie, 10),
      };
    case 'currentLampValue':
      return {
        value: parseFloat(value),
        lamp: parseInt(subpropertie, 10),
      };
    default:
      throw new Error(`State parsing is not implemented for propertie ${propertie}`);
  }
}

module.exports = {
  checkAlarmState,
  parseStates,
  uvcDeviceModel,
};
