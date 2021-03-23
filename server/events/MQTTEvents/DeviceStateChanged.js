const UVCDevice = require('../../dataModels/UVCDevice');
const UVCGroup = require('../../dataModels/UVCGroup');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'DeviceStateChangedEvent' });

const stack = [];

function hasDeviceAlarm(databaseDevice, hasAlarm) {
  if (hasAlarm === true && databaseDevice.alarmState === false) {
    return true;
  }
  if (hasAlarm === false && databaseDevice.alarmState === true) {
    return false;
  }
  return undefined;
}

async function checkAlarm(db, device, io, newState) {
  // Alarm Checking
  const deviceShouldHaveAlarm = UVCDevice.checkAlarmState(device);
  const deviceGroup = (device.group._id !== undefined)
    ? await db.getGroup(device.group._id.toString()) : undefined;

  const alarmStateChangedToAlarm = hasDeviceAlarm(device, deviceShouldHaveAlarm);

  if (alarmStateChangedToAlarm === true && alarmStateChangedToAlarm !== undefined) {
    logger.warn(`Device ${newState.serialnumber} has a alarm`);
    await db.setDeviceAlarm(newState.serialnumber, true);
    io.emit('device_alarm', {
      serialnumber: newState.serialnumber,
      alarmValue: true,
    });
  } else if (alarmStateChangedToAlarm === false && alarmStateChangedToAlarm !== undefined) {
    logger.info(`Device ${newState.serialnumber} has no alarm anymore`);
    await db.setDeviceAlarm(newState.serialnumber, false);
    io.emit('device_alarm', {
      serialnumber: newState.serialnumber,
      alarmValue: false,
    });
  }

  if (device.group._id !== undefined) {
    const group = await db.getGroup(device.group._id.toString());

    if (deviceGroup.alarmState !== group.alarmState) {
      logger.warn(`Group ${group.id} has ${group.alarmState ? 'a alarm' : 'no alarm anymore'}`);
      io.emit('group_deviceAlarm', {
        serialnumber: newState.serialnumber,
        group: group.id.toString(),
        alarmValue: group.alarmState,
      });
    }
  }
}

async function updateDatabase(db, newState) {
  logger.info(`Updating device ${newState.serialnumber} in database with new State %o`, newState);
  let device = {};

  switch (newState.prop) {
    case 'currentLampValue':
      await db.addLampValue({
        device: newState.serialnumber,
        lamp: newState.lamp,
        value: newState.newValue,
      });
      break;
    case 'currentLampState':
      await db.setLampState({
        device: newState.serialnumber,
        state: newState.newValue,
        lamp: newState.lamp,
      });
      break;
    case 'tacho':
      await db.addTacho({
        device: newState.serialnumber,
        tacho: newState.newValue,
      });
      break;
    case 'currentAirVolume':
      await db.addAirVolume({
        device: newState.serialnumber,
        volume: newState.newValue,
      });
      break;
    case 'currentFanState':
      await db.addFanState({
        device: newState.serialnumber,
        state: newState.newValue,
      });
      break;
    case 'currentBodyState':
      await db.addBodyState({
        device: newState.serialnumber,
        state: newState.newValue,
      });
      break;
    case 'currentFanVoltage':
      await db.addFanVoltage({
        device: newState.serialnumber,
        voltage: newState.newValue,
      });
      break;
    case 'currentCO2':
      await db.addCO2({
        device: newState.serialnumber,
        co2: newState.newValue,
      });
      break;
    case 'currentTVOC':
      await db.addTVOC({
        device: newState.serialnumber,
        tvoc: newState.newValue,
      });
      break;

    default:
      device = {
        serialnumber: newState.serialnumber,
      };

      device[newState.prop] = newState.newValue;

      await db.updateDevice(device);
      break;
  }
}

/**
 * Mapping the MQTT topic to the database schemas
 * @param {String} topic The MQTT topic
 * @returns {Object} Parsed Object with serialnumber, prop and subprop
 */
function mapMQTTTopicToDatabase(topic) {
  const topicArray = topic.split('/');

  logger.debug('Mapping topic %s to database schemas', topic);

  if (topicArray.length < 4 || topicArray.length > 5) {
    throw new Error('Topic can not be parsed because it has the wrong format');
  }

  const serialnumber = topicArray[1];
  const prop = topicArray[3];
  const subprop = topicArray[4];

  switch (prop) {
    case 'name':
      return { serialnumber, prop: 'name' };
    case 'engineState':
      return { serialnumber, prop: 'engineState' };
    case 'engineLevel':
      return { serialnumber, prop: 'engineLevel' };
    case 'airVolume':
      return { serialnumber, prop: 'currentAirVolume' };
    case 'lamp':
      if (subprop === undefined) {
        throw new Error(`Can not parse state with propertie ${prop}`);
      } else if (!Number.isNaN(subprop)) {
        return { serialnumber, prop: 'currentLampValue', subprop: parseInt(subprop, 10) };
      } else {
        throw new Error(`Can not parse state with propertie ${prop}`);
      }
    case 'eventMode':
      return { serialnumber, prop: 'eventMode' };
    case 'fan':
      return { serialnumber, prop: 'currentFanVoltage' };
    case 'alarm':
      if (subprop === undefined) {
        throw new Error(`Can not parse state with propertie ${prop}`);
      } else if (subprop === 'tempBody') {
        return { serialnumber, prop: 'currentBodyState' };
      } else if (subprop === 'tempFan') {
        return { serialnumber, prop: 'currentFanState' };
      } else if (!Number.isNaN(parseInt(subprop, 10))) {
        return { serialnumber, prop: 'currentLampState', subprop: parseInt(subprop, 10) };
      } else {
        throw new Error(`Can not parse state with propertie ${prop} with subpropertie ${subprop}`);
      }
    case 'tacho':
      return { serialnumber, prop: 'tacho' };
    case 'co2':
      return { serialnumber, prop: 'currentCO2' };
    case 'tvoc':
      return { serialnumber, prop: 'currentTVOC' };
    default:
      throw new Error(`Can not parse state with propertie ${prop}`);
  }
}

async function execute(db, io, mqtt, topic, message, next) {
  logger.info(`Got MQTT message at topic ${topic} with message ${message.message}`);
  const props = mapMQTTTopicToDatabase(topic);

  const parsed = UVCDevice.parseStates(props.prop, props.subprop, message.message);

  const newState = {
    serialnumber: props.serialnumber,
    prop: props.prop,
    newValue: parsed.value,
  };

  if (parsed.lamp !== undefined) {
    newState.lamp = parsed.lamp;
  }

  await updateDatabase(db, newState);

  const device = await db.getDevice(newState.serialnumber);

  await checkAlarm(db, device, io, newState);

  if (device.group._id !== undefined) {
    logger.debug('Device is in a group. Updating group');
    await UVCGroup.updateGroupStates(device.group._id.toString(), newState.prop, db, io);
  }

  io.emit('device_stateChanged', newState);
}

function use(...middleware) {
  stack.push(...middleware);
}

async function executeMiddleware(db, io, mqtt, topic, message) {
  let prevIndex = -1;

  async function runner(index) {
    if (index === prevIndex) {
      throw new Error('next() called multiple times');
    }

    prevIndex = index;

    const middleware = stack[index];

    if (middleware) {
      logger.debug('Executing middleware at index %s', index);
      await middleware(db, io, mqtt, topic, message, () => runner(index + 1));
    }
  }

  await runner(0);
}

function register(server, db, io, mqtt) {
  logger.info('Registering socketIO module');
  mqtt.on('message', async (topic, message) => {
    if (topic.split('/')[2] !== 'stateChanged') return;
    const msg = {
      message: message.toString(),
    };
    try {
      await executeMiddleware(db, io, mqtt, topic, msg);
      await execute(db, io, mqtt, topic, msg);
    } catch (e) {
      server.emit('error', { service: 'DeviceStateChangedEvent', error: e });
    }
  });
}

module.exports = {
  register,
  executeMiddleware,
  use,
  mapMQTTTopicToDatabase,
  checkAlarm,
  updateDatabase,
  execute,
  hasDeviceAlarm,
};
