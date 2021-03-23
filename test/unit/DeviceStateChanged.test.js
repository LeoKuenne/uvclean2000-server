/* eslint-disable no-await-in-loop */
const EventEmitter = require('events');
const DeviceStateChanged = require('../../server/events/MQTTEvents/DeviceStateChanged');

const {
  mapMQTTTopicToDatabase,
  hasDeviceAlarm,
  updateDatabase,
  checkAlarm,
} = require('../../server/events/MQTTEvents/DeviceStateChanged');
const MongoDBAdapter = require('../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');

describe('Middleware functionality', () => {
  it('Middleware chain calls one after another and does not calls the next one if next is not called', () => {
    const middleware1 = jest.fn();
    const middleware2 = jest.fn();
    const middleware3 = jest.fn();
    const middleware4 = jest.fn();

    const server = jest.fn();
    const db = jest.fn();
    const io = new EventEmitter();
    const mqtt = jest.fn();
    const message = 'Message';

    DeviceStateChanged.use((server, db, io, mqtt, message, next) => {
      middleware1();
      next();
    });

    DeviceStateChanged.use((server, db, io, mqtt, message, next) => {
      middleware2();
      next();
    });

    DeviceStateChanged.use((server, db, io, mqtt, message, next) => {
      middleware3();
    });

    DeviceStateChanged.use((server, db, io, mqtt, message, next) => {
      middleware4();
    });

    DeviceStateChanged.executeMiddleware(server, db, io, mqtt, message);

    expect(middleware1).toHaveBeenCalledTimes(1);
    expect(middleware1).toHaveBeenCalledTimes(1);
    expect(middleware3).toHaveBeenCalledTimes(1);
    expect(middleware4).toHaveBeenCalledTimes(0);
  });
});

describe('function mapMQTTTopicToDatabase', () => {
  it.each([
    ['UVClean/123/stateChanged/name', { serialnumber: '123', prop: 'name' }],
    ['UVClean/123/stateChanged/engineState', { serialnumber: '123', prop: 'engineState' }],
    ['UVClean/123/stateChanged/fan', { serialnumber: '123', prop: 'currentFanVoltage' }],
    ['UVClean/123/stateChanged/tvoc', { serialnumber: '123', prop: 'currentTVOC' }],
    ['UVClean/123/stateChanged/co2', { serialnumber: '123', prop: 'currentCO2' }],
    ['UVClean/123/stateChanged/engineLevel', { serialnumber: '123', prop: 'engineLevel' }],
    ['UVClean/123/stateChanged/airVolume', { serialnumber: '123', prop: 'currentAirVolume' }],
    ['UVClean/123/stateChanged/tacho', { serialnumber: '123', prop: 'tacho' }],
    ['UVClean/123/stateChanged/alarm/1', { serialnumber: '123', prop: 'currentLampState', subprop: 1 }],
    ['UVClean/123/stateChanged/alarm/tempBody', { serialnumber: '123', prop: 'currentBodyState' }],
    ['UVClean/123/stateChanged/alarm/tempFan', { serialnumber: '123', prop: 'currentFanState' }],
    ['UVClean/123/stateChanged/lamp/1', { serialnumber: '123', prop: 'currentLampValue', subprop: 1 }],
  ])('Mapping %s to %o', (topic, result) => {
    expect(mapMQTTTopicToDatabase(topic)).toEqual(result);
  });

  it.each([
    ['UVClean/123/stateChanged', 'Topic can not be parsed because it has the wrong format'],
    ['UVClean/123/stateChanged/prop/subprop/subsubprop', 'Topic can not be parsed because it has the wrong format'],
    ['UVClean/123/stateChanged/NAME', 'Can not parse state with propertie NAME'],
    ['UVClean/123/stateChanged/alarm/body', 'Can not parse state with propertie alarm with subpropertie body'],
    ['UVClean/123/stateChanged/alarm/fan', 'Can not parse state with propertie alarm with subpropertie fan'],
    ['UVClean/123/stateChanged/lamp', 'Can not parse state with propertie lamp'],
  ])('Mapping %s throws error %s', (topic, error) => {
    expect(() => mapMQTTTopicToDatabase(topic)).toThrow(new Error(error));
  });
});

describe('function hasDeviceAlarm', () => {
  it.each([
    [true, true, undefined],
    [false, false, undefined],
    [false, true, true],
    [true, false, false],
  ])('databaseDevice has alarm state %s, hasAlarm is %s, should be %s', (databaseDeviceState, hasAlarmState, result) => {
    expect(hasDeviceAlarm({ alarmState: databaseDeviceState }, hasAlarmState)).toBe(result);
  });
});

describe('function updateDatabase', () => {
  it.each([
    [{
      serialnumber: '1', prop: 'currentLampValue', newValue: '1', lamp: '1',
    }, 'addLampValue', { device: '1', lamp: '1', value: '1' }],
    [{
      serialnumber: '1', prop: 'currentLampState', newValue: 'Ok', lamp: '1',
    }, 'setLampState', { device: '1', lamp: '1', state: 'Ok' }],
    [{
      serialnumber: '1', prop: 'currentLampState', newValue: 'Alarm', lamp: '1',
    }, 'setLampState', { device: '1', lamp: '1', state: 'Alarm' }],
    [{
      serialnumber: '1', prop: 'tacho', newValue: '1',
    }, 'addTacho', { device: '1', tacho: '1' }],
    [{
      serialnumber: '1', prop: 'currentAirVolume', newValue: '1',
    }, 'addAirVolume', { device: '1', volume: '1' }],
    [{
      serialnumber: '1', prop: 'currentFanState', newValue: 'Ok',
    }, 'addFanState', { device: '1', state: 'Ok' }],
    [{
      serialnumber: '1', prop: 'currentBodyState', newValue: 'Ok',
    }, 'addBodyState', { device: '1', state: 'Ok' }],
    [{
      serialnumber: '1', prop: 'currentFanState', newValue: 'Alarm',
    }, 'addFanState', { device: '1', state: 'Alarm' }],
    [{
      serialnumber: '1', prop: 'currentBodyState', newValue: 'Alarm',
    }, 'addBodyState', { device: '1', state: 'Alarm' }],
    [{
      serialnumber: '1', prop: 'name', newValue: 'Ok',
    }, 'updateDevice', { serialnumber: '1', name: 'Ok' }],
    [{
      serialnumber: '1', prop: 'engineState', newValue: true,
    }, 'updateDevice', { serialnumber: '1', engineState: true }],
    [{
      serialnumber: '1', prop: 'engineLevel', newValue: 1,
    }, 'updateDevice', { serialnumber: '1', engineLevel: 1 }],
    [{
      serialnumber: '1', prop: 'currentFanVoltage', newValue: 1,
    }, 'addFanVoltage', { device: '1', voltage: 1 }],
    [{
      serialnumber: '1', prop: 'currentCO2', newValue: 1,
    }, 'addCO2', { device: '1', co2: 1 }],
    [{
      serialnumber: '1', prop: 'currentTVOC', newValue: 1,
    }, 'addTVOC', { device: '1', tvoc: 1 }],
  ])('NewState %o calls database %s method with %o', (newState, method, dbArgs) => {
    const db = {};
    db[method] = jest.fn();
    updateDatabase(db, newState);
    expect(db[method]).toHaveBeenCalledWith(dbArgs);
  });
});

describe('function checkAlarm', () => {
  let database;
  beforeAll(async () => {
    database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.clearCollection('uvcdevices');
    await database.clearCollection('uvcgroups');
    await database.clearCollection('airvolumes');
    await database.clearCollection('lampvalues');
    await database.clearCollection('fanstates');
    await database.clearCollection('bodystates');
    await database.clearCollection('tachos');
  });

  it.each([
    [true, false, false, 'lampState'],
    [false, true, true, 'lampState'],
    [false, false, null, 'lampState'],
    [true, true, null, 'lampState'],
    [true, false, false, 'bodyState'],
    [false, true, true, 'bodyState'],
    [false, false, null, 'bodyState'],
    [true, true, null, 'bodyState'],
    [true, false, false, 'fanState'],
    [false, true, true, 'fanState'],
    [false, false, null, 'fanState'],
    [true, true, null, 'fanState'],
  ])('deviceAlarmState is %s, deviceHasAlarm is %s, alarmValue should be %s, with propertie %s', async (deviceAlarmState, deviceHasAlarm, alarmValue, prop, done) => {
    await database.addDevice({
      name: 'Test Device',
      serialnumber: '0002145702154',
    });

    await database.setDeviceAlarm('0002145702154', deviceAlarmState);
    switch (prop) {
      case 'lampState':
        await database.setLampState({
          device: '0002145702154', lamp: '1', state: (deviceHasAlarm) ? 'Alarm' : 'Ok',
        });
        break;
      case 'bodyState':
        await database.addBodyState({ device: '0002145702154', state: (deviceHasAlarm) ? 'Alarm' : 'Ok' });
        break;
      case 'fanState':
        await database.addFanState({ device: '0002145702154', state: (deviceHasAlarm) ? 'Alarm' : 'Ok' });
        break;

      default:
        break;
    }

    const io = new EventEmitter();
    const alarm = jest.fn();

    if (alarmValue !== null) {
      io.on('device_alarm', (options) => {
        try {
          expect(options.serialnumber).toMatch('0002145702154');
          expect(options.alarmValue).toBe(alarmValue);
          done();
        } catch (e) {
          done(e);
        }
      });
    } else {
      io.on('device_alarm', (options) => {
        console.log(options);
        alarm();
      });
    }

    const device = await database.getDevice('0002145702154');

    await checkAlarm(database, device, io, { serialnumber: '0002145702154' });
    expect(alarm).not.toHaveBeenCalled();
    done();
  });

  it('Iterating 10 times with alternating deviceAlarmState', async (done) => {
    const io = new EventEmitter();
    const alarm = jest.fn();
    let i = 0;

    await database.addDevice({
      name: 'Test Device',
      serialnumber: '0002145702154',
    });
    await database.addBodyState({ device: '1', state: 'Ok' });
    await database.addFanState({ device: '1', state: 'Ok' });
    await database.setDeviceAlarm('0002145702154', false);

    io.on('device_alarm', (options) => {
      switch (i % 3) {
        case 0:
          expect(options.serialnumber).toMatch('0002145702154');
          expect(options.alarmValue).toBe(true);
          break;
        case 1:
          console.log(options);
          alarm();
          break;
        case 2:
          expect(options.serialnumber).toMatch('0002145702154');
          expect(options.alarmValue).toBe(false);
          break;

        default:
          break;
      }
    });
    let device = null;

    for (i = 0; i < 12; i += 1) {
      switch (i % 3) {
        case 0: // Alarm
          await database.addFanState({
            device: '0002145702154', state: 'Alarm',
          });

          device = await database.getDevice('0002145702154');
          await checkAlarm(database, device, io, { serialnumber: '0002145702154' });
          break;
        case 1: // Alarm change -> BodyState in, LampState out
          await database.addBodyState({
            device: '0002145702154', state: 'Alarm',
          });

          await database.addFanState({
            device: '0002145702154', state: 'Ok',
          });
          device = await database.getDevice('0002145702154');
          await checkAlarm(database, device, io, { serialnumber: '0002145702154' });
          expect(alarm).not.toHaveBeenCalled();
          break;
        case 2: // LampState out - no alarm
          await database.addFanState({
            device: '0002145702154', state: (i % 2) ? 'Alarm' : 'Ok',
          });

          device = await database.getDevice('0002145702154');
          await checkAlarm(database, device, io, { serialnumber: '0002145702154' });
          break;
        default:
          break;
      }
    }
    done();
  });
});

describe('Iterating function checkAlarm', () => {
  let database = null;
  let io = null;
  let group = null;
  const deviceAlarm = jest.fn();
  const groupAlarm = jest.fn();

  beforeAll(async () => {
    database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
    await database.connect();

    io = new EventEmitter();

    await database.addDevice({
      name: 'Test Device',
      serialnumber: '1',
    });

    await database.addDevice({
      name: 'Test Device',
      serialnumber: '2',
    });

    group = await database.addGroup({
      name: 'Test Group',
    });

    await database.addDeviceToGroup('1', `${group._id}`);
    await database.addDeviceToGroup('2', `${group._id}`);
  });

  afterAll(async () => {
    await database.close();
  });

  afterEach(() => {
    io.removeAllListeners('device_alarm');
    io.removeAllListeners('group_deviceAlarm');
  });

  it.each([
    [1, true, true, true],
    [1, true, null, null],
    [1, false, false, false],
    [1, true, true, true],
    [1, false, false, false],
    [1, false, null, null],
    [1, true, true, true],
    [2, true, null, null],
    [2, false, null, null],
    [1, false, false, false],
  ])('Device alarm check: For lamp %i sending alarm: %s expecting alarms: device: %s, group: %s', async (lamp, deviceHasAlarm, alarmResult, groupResult, done) => {
    await database.setLampState({
      device: '1', lamp, state: (deviceHasAlarm) ? 'Alarm' : 'Ok',
    });

    io.on('device_alarm', (options) => {
      if (alarmResult === null) {
        deviceAlarm();
      } else {
        try {
          expect(options.serialnumber).toMatch('1');
          expect(options.alarmValue).toBe(alarmResult);
          done();
        } catch (e) {
          done(e);
        }
      }
    });
    const device = await database.getDevice('1');

    await checkAlarm(database, device, io, { serialnumber: '1' });

    if (alarmResult === null) {
      expect(deviceAlarm).not.toHaveBeenCalled();
      done();
    }
  });

  it.each([
    [true, true, true],
    [true, null, null],
    [false, false, false],
    [true, true, true],
    [false, false, false],
    [false, null, null],
    [true, true, true],
    [true, null, null],
    [false, false, false],
  ])('Device alarm check: For body state sending alarm: %s expecting alarms: device: %s, group: %s', async (deviceHasAlarm, alarmResult, groupResult, done) => {
    await database.addBodyState({
      device: '1', state: (deviceHasAlarm) ? 'Alarm' : 'Ok',
    });

    io.on('device_alarm', (options) => {
      if (alarmResult === null) {
        deviceAlarm();
      } else {
        try {
          expect(options.serialnumber).toMatch('1');
          expect(options.alarmValue).toBe(alarmResult);
          done();
        } catch (e) {
          done(e);
        }
      }
    });
    const device = await database.getDevice('1');

    await checkAlarm(database, device, io, { serialnumber: '1' });

    if (alarmResult === null) {
      expect(deviceAlarm).not.toHaveBeenCalled();
      done();
    }
  });

  it.each([
    ['1', 1, true, true],
    ['1', 1, false, false],
    ['2', 1, true, true],
    ['2', 2, true, null],
    ['2', 1, false, null],
    ['2', 2, false, false],
    ['2', 1, false, null],
    ['1', 1, false, null],
    ['1', 1, true, true],
    ['1', 2, true, null],
    ['1', 2, false, null],
    ['1', 1, false, false],
    ['2', 1, true, true],
    ['1', 1, true, null],
    ['2', 1, false, null],
    ['1', 1, false, false],
  ])('Group alarm check: For device: %s, lamp %i sending alarm: %s expecting alarms: group: %s', async (device, lamp, deviceHasAlarm, groupResult, done) => {
    await database.setLampState({
      device, lamp, state: (deviceHasAlarm) ? 'Alarm' : 'Ok',
    });

    io.on('group_deviceAlarm', (options) => {
      if (groupResult === null) {
        groupAlarm();
      } else {
        try {
          expect(options.serialnumber).toMatch(device);
          expect(options.group).toMatch(group._id.toString());
          expect(options.alarmValue).toBe(groupResult);
          done();
        } catch (e) {
          done(e);
        }
      }
    });
    const dev = await database.getDevice(device);

    await checkAlarm(database, dev, io, { serialnumber: device });
    if (groupResult === null) {
      expect(deviceAlarm).not.toHaveBeenCalled();
      done();
    }
  }, 1000);
});
