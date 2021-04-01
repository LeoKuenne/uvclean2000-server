const EventEmitter = require('events');
const { register } = require('../../server/events/MQTTEvents/DeviceStateChanged');
const MongoDBAdapter = require('../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');

let database;

expect.extend({
  toContainObject(received, argument) {
    const pass = this.equals(received,
      expect.arrayContaining([
        expect.objectContaining(argument),
      ]));

    if (pass) {
      return {
        message: () => (`expected ${this.utils.printReceived(received)} not to contain object ${this.utils.printExpected(argument)}`),
        pass: true,
      };
    }
    return {
      message: () => (`expected ${this.utils.printReceived(received)} to contain object ${this.utils.printExpected(argument)}`),
      pass: false,
    };
  },
});

beforeAll(async () => {
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
});

afterAll(async () => {
  await database.close();
});

describe('DeviceStateChanged MQTT Module', () => {
  afterEach(async () => {
    await database.clearCollection('uvcdevices');
    await database.clearCollection('uvcgroups');
    await database.clearCollection('airvolumes');
    await database.clearCollection('lampvalues');
    await database.clearCollection('fanstates');
    await database.clearCollection('bodystates');
    await database.clearCollection('tachos');
  });

  it.each([
    ['alarm/1', 'Ok', {
      lamp: 1, newValue: 'Ok', prop: 'currentLampState', serialnumber: '0002145702154',
    }],
    ['alarm/2', 'Ok', {
      lamp: 2, newValue: 'Ok', prop: 'currentLampState', serialnumber: '0002145702154',
    }],
    ['alarm/tempBody', 'Ok', {
      newValue: 'Ok', prop: 'currentBodyState', serialnumber: '0002145702154',
    }],
    ['alarm/tempFan', 'Ok', {
      newValue: 'Ok', prop: 'currentFanState', serialnumber: '0002145702154',
    }],
    ['alarm/1', 'Alarm', {
      lamp: 1, newValue: 'Alarm', prop: 'currentLampState', serialnumber: '0002145702154',
    }],
    ['alarm/2', 'Alarm', {
      lamp: 2, newValue: 'Alarm', prop: 'currentLampState', serialnumber: '0002145702154',
    }],
    ['alarm/tempBody', 'Alarm', {
      newValue: 'Alarm', prop: 'currentBodyState', serialnumber: '0002145702154',
    }],
    ['alarm/tempFan', 'Alarm', {
      newValue: 'Alarm', prop: 'currentFanState', serialnumber: '0002145702154',
    }],
    ['engineState', true, {
      newValue: true, prop: 'engineState', serialnumber: '0002145702154',
    }],
    ['airVolume', 100, {
      newValue: 100, prop: 'currentAirVolume', serialnumber: '0002145702154',
    }],
    ['lamp/1', 100, {
      lamp: 1, newValue: 100, prop: 'currentLampValue', serialnumber: '0002145702154',
    }],
    ['eventMode', true, {
      newValue: true, prop: 'eventMode', serialnumber: '0002145702154',
    }],
  ])('Parses %s with %s accordingly and emits device_stateChanged socketio event', async (topic, message, result, done) => {
    const mqtt = new EventEmitter();
    const server = new EventEmitter();
    const io = new EventEmitter();

    await database.addDevice({
      name: 'Test Gerat',
      serialnumber: '0002145702154',
    });

    register(server, database, io, mqtt);

    io.on('device_stateChanged', (prop) => {
      expect(prop).toEqual(result);
      done();
    });

    mqtt.emit('message', `UVClean/0002145702154/stateChanged/${topic}`, message);
  });

  it.each([
    ['engineState', true, false],
    ['engineLevel', '1', '2'],
    ['eventMode', true, false],
    ['engineState', true, true],
    ['engineLevel', '1', '1'],
    ['eventMode', true, true],
  ])('Parses %s with %s accordingly and emits group_devicesWithOtherStateChanged socketio event', async (prop, state, groupState, done) => {
    const mqtt = new EventEmitter();
    const server = new EventEmitter();
    const io = new EventEmitter();

    const device = await database.addDevice({
      name: 'Test Gerat',
      serialnumber: '0002145702154',
    });

    const group = await database.addGroup({
      name: 'Test Group',
    });

    await database.addDeviceToGroup(device.serialnumber, group._id.toString());

    const updateGroupProp = {
      id: group._id.toString(),
    };
    updateGroupProp[prop] = groupState;

    await database.updateGroup(updateGroupProp);

    register(server, database, io, mqtt);

    io.on('group_devicesWithOtherStateChanged', (option) => {
      expect(option.id).toEqual(group._id.toString());
      expect(option.prop).toEqual(`${prop}DevicesWithOtherState`);
      if (state !== groupState) {
        expect(option.newValue).toEqual([{
          _id: device._id,
          name: device.name,
          serialnumber: device.serialnumber,
        }]);
      } else {
        expect(option.newValue).toEqual([]);
      }
      done();
    });

    mqtt.emit('message', `UVClean/0002145702154/stateChanged/${prop}`, state);
  });

  it.each([
    ['alarm/1', 'Alarm', {
      serialnumber: '0002145702154', alarmValue: true,
    }, {
      lamp: 1, newValue: 'Alarm', prop: 'currentLampState', serialnumber: '0002145702154',
    }],
    ['alarm/1', 'Ok', {
      serialnumber: '0002145702154', alarmValue: false,
    }, {
      lamp: 1, newValue: 'Ok', prop: 'currentLampState', serialnumber: '0002145702154',
    }],
    ['alarm/tempBody', 'Alarm', {
      serialnumber: '0002145702154', alarmValue: true,
    }, {
      newValue: 'Alarm', prop: 'currentBodyState', serialnumber: '0002145702154',
    }],
    ['alarm/tempBody', 'Ok', {
      serialnumber: '0002145702154', alarmValue: false,
    }, {
      newValue: 'Ok', prop: 'currentBodyState', serialnumber: '0002145702154',
    }],
    ['alarm/tempFan', 'Alarm', {
      serialnumber: '0002145702154', alarmValue: true,
    }, {
      newValue: 'Alarm', prop: 'currentFanState', serialnumber: '0002145702154',
    }],
    ['alarm/tempFan', 'Ok', {
      serialnumber: '0002145702154', alarmValue: false,
    }, {
      newValue: 'Ok', prop: 'currentFanState', serialnumber: '0002145702154',
    }],
  ])('Parses %s with %s accordingly and updates alarmState', async (topic, message, alarmResult, deviceResult, done) => {
    const mqtt = new EventEmitter();
    const io = new EventEmitter();
    const server = new EventEmitter();
    register(server, database, io, mqtt);

    await database.addDevice({
      name: 'Test Gerat',
      serialnumber: '0002145702154',
    });

    switch (topic) {
      case 'alarm/1':
        await database.setLampState({
          device: '0002145702154',
          lamp: 1,
          state: (message === 'Ok') ? 'Alarm' : 'Ok',
        });
        break;
      case 'alarm/tempBody':
        await database.addBodyState({
          device: '0002145702154',
          state: (message === 'Ok') ? 'Alarm' : 'Ok',
        });
        break;
      case 'alarm/tempFan':
        await database.addFanState({
          device: '0002145702154',
          state: (message === 'Ok') ? 'Alarm' : 'Ok',
        });
        break;

      default:
        break;
    }
    const oldDevice = await database.setDeviceAlarm('0002145702154', (message === 'Ok'));

    io.on('device_alarm', async (prop) => {
      expect(prop).toEqual(alarmResult);
      const d = await database.getDevice('0002145702154');
      expect(d.alarmState).toBe(alarmResult.alarmValue);
      expect(oldDevice.alarmState).not.toBe(alarmResult.alarmValue);
      done();
    });

    io.on('device_stateChanged', (prop) => {
      expect(prop).toEqual(deviceResult);
    });

    mqtt.emit('message', `UVClean/0002145702154/stateChanged/${topic}`, message);
  }, 1000);

  it.each([
    ['alarm/1', 'Alarm', {
      serialnumber: '0002145702154', alarmValue: true,
    }, {
      lamp: 1, newValue: 'Alarm', prop: 'currentLampState', serialnumber: '0002145702154',
    }],
    ['alarm/1', 'Ok', {
      serialnumber: '0002145702154', alarmValue: false,
    }, {
      lamp: 1, newValue: 'Ok', prop: 'currentLampState', serialnumber: '0002145702154',
    }],
    ['alarm/tempBody', 'Alarm', {
      serialnumber: '0002145702154', alarmValue: true,
    }, {
      newValue: 'Alarm', prop: 'currentBodyState', serialnumber: '0002145702154',
    }],
    ['alarm/tempBody', 'Ok', {
      serialnumber: '0002145702154', alarmValue: false,
    }, {
      newValue: 'Ok', prop: 'currentBodyState', serialnumber: '0002145702154',
    }],
    ['alarm/tempFan', 'Alarm', {
      serialnumber: '0002145702154', alarmValue: true,
    }, {
      newValue: 'Alarm', prop: 'currentFanState', serialnumber: '0002145702154',
    }],
    ['alarm/tempFan', 'Ok', {
      serialnumber: '0002145702154', alarmValue: false,
    }, {
      newValue: 'Ok', prop: 'currentFanState', serialnumber: '0002145702154',
    }],
  ])('Parses %s with %s accordingly and updates alarmState in Group', async (topic, message, alarmResult, result, done) => {
    const mqtt = new EventEmitter();
    const io = new EventEmitter();
    const server = new EventEmitter();
    let group_deviceAlarmProp = null;

    await database.addDevice({
      name: 'Test Gerat',
      serialnumber: '0002145702154',
    });

    const oldDevice = await database.setDeviceAlarm('0002145702154', (message === 'Ok'));

    const group = await database.addGroup({
      name: 'Test Group',
    });

    await database.addDeviceToGroup('0002145702154', group._id.toString());

    const oldGroup = await database.setGroupAlarm(group._id.toString(), (message === 'Ok'));

    register(server, database, io, mqtt);

    mqtt.emit('message', `UVClean/0002145702154/stateChanged/${topic}`, message);

    io.on('device_alarm', (prop) => {
      expect(prop).toEqual(alarmResult);
    });

    io.on('group_deviceAlarm', (prop) => {
      group_deviceAlarmProp = prop;
    });

    io.on('device_stateChanged', (prop) => {
      expect(prop).toEqual(result);
      expect(group_deviceAlarmProp).toEqual({
        alarmValue: alarmResult.alarmValue,
        serialnumber: alarmResult.serialnumber,
        group: group._id.toString(),
      });
      done();
    });
  });
});

describe('Iterating over different states', () => {
  const mqtt = new EventEmitter();
  const io = new EventEmitter();
  const server = new EventEmitter();
  let group = null;
  const deviceAlarm = jest.fn();
  const groupAlarm = jest.fn();

  beforeAll(async () => {
    register(server, database, io, mqtt);
    await database.addDevice({
      name: 'Test Gerat',
      serialnumber: '1',
    });

    await database.addDevice({
      name: 'Test Gerat',
      serialnumber: '2',
    });

    group = await database.addGroup({
      name: 'Test Group',
    });

    await database.addDeviceToGroup('1', `${group._id}`);
    await database.addDeviceToGroup('2', `${group._id}`);
  });

  afterEach(() => {
    io.removeAllListeners('device_alarm');
    io.removeAllListeners('group_deviceAlarm');
    jest.clearAllMocks();
  });

  it.each([
    ['alarm/1', 'Alarm', true],
    ['alarm/1', 'Ok', false],
    ['alarm/1', 'Ok', null],
    ['alarm/1', 'Alarm', true],
    ['alarm/1', 'Alarm', null],
    ['alarm/2', 'Alarm', null],
    ['alarm/1', 'Ok', null],
    ['alarm/2', 'Ok', false],
    ['alarm/1', 'Alarm', true],
    ['alarm/1', 'Ok', false],
    ['alarm/tempBody', 'Alarm', true],
    ['alarm/tempBody', 'Ok', false],
    ['alarm/tempFan', 'Alarm', true],
    ['alarm/tempFan', 'Ok', false],
    ['alarm/tempBody', 'Alarm', true],
    ['alarm/tempBody', 'Ok', false],
    ['alarm/tempFan', 'Alarm', true],
    ['alarm/tempFan', 'Ok', false],
    ['alarm/tempBody', 'Ok', null],
    ['alarm/tempBody', 'Alarm', true],
    ['alarm/tempBody', 'Alarm', null],
    ['alarm/tempFan', 'Alarm', null],
    ['alarm/tempBody', 'Alarm', null],
    ['alarm/tempFan', 'Alarm', null],
    ['alarm/tempBody', 'Ok', null],
    ['alarm/tempFan', 'Ok', false],
    ['alarm/tempBody', 'Ok', null],
    ['alarm/tempFan', 'Ok', null],
  ])('Device AlarmState: Setting topic %s to %s, expected devicealarm %s', (topic, message, deviceResult, done) => {
    io.on('device_alarm', (option) => {
      if (deviceResult === null) {
        deviceAlarm();
      } else {
        try {
          expect(option).toEqual({
            alarmValue: deviceResult,
            serialnumber: '1',
          });
        } catch (e) {
          done(e);
        }
      }
    });

    mqtt.emit('message', `UVClean/1/stateChanged/${topic}`, message);

    io.on('device_stateChanged', () => {
      if (deviceResult === null) {
        expect(deviceAlarm).not.toHaveBeenCalled();
      }
      done();
    });
  });

  it.each([
    ['1', 'alarm/1', 'Alarm', true],
    ['1', 'alarm/1', 'Ok', false],
    ['2', 'alarm/1', 'Ok', null],
    ['2', 'alarm/1', 'Alarm', true],
    ['1', 'alarm/1', 'Alarm', null],
    ['1', 'alarm/2', 'Alarm', null],
    ['2', 'alarm/1', 'Alarm', null],
    ['2', 'alarm/2', 'Alarm', null],
    ['1', 'alarm/1', 'Ok', null],
    ['1', 'alarm/2', 'Ok', null],
    ['2', 'alarm/1', 'Ok', null],
    ['2', 'alarm/2', 'Ok', false],
    ['1', 'alarm/tempBody', 'Alarm', true],
    ['1', 'alarm/tempBody', 'Ok', false],
    ['2', 'alarm/tempBody', 'Ok', null],
    ['2', 'alarm/tempBody', 'Alarm', true],
    ['1', 'alarm/tempBody', 'Alarm', null],
    ['1', 'alarm/tempFan', 'Alarm', null],
    ['2', 'alarm/tempBody', 'Alarm', null],
    ['2', 'alarm/tempFan', 'Alarm', null],
    ['1', 'alarm/tempBody', 'Ok', null],
    ['1', 'alarm/tempFan', 'Ok', null],
    ['2', 'alarm/tempBody', 'Ok', null],
    ['2', 'alarm/tempFan', 'Ok', false],
  ])('Group AlarmState: Setting device %s, topic %s to %s, expected groupalarm %s', (device, topic, message, groupResult, done) => {
    io.on('group_deviceAlarm', (option) => {
      if (groupResult === null) {
        groupAlarm();
      } else {
        try {
          expect(option).toEqual({
            alarmValue: groupResult,
            group: group._id.toString(),
            serialnumber: device,
          });
        } catch (e) {
          done(e);
        }
      }
    });

    mqtt.emit('message', `UVClean/${device}/stateChanged/${topic}`, message);

    io.on('device_stateChanged', () => {
      if (groupResult === null) {
        expect(groupAlarm).not.toHaveBeenCalled();
      }
      done();
    });
  });
});
