const EventEmitter = require('events');
const { register, updateGroup } = require('../../../server/events/MQTTEvents/DeviceStateChanged');
const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');

let database;

beforeAll(async () => {
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
});

afterAll(async () => {
  await database.close();
});

describe('Issue #17, device_alarm is emitted if device has alarm and a non alarm message is recieved on mqtt.', () => {
  afterEach(async () => {
    await database.clearCollection('uvcdevices');
  });

  it.each([
    ['engineState', 'true'],
  ])('%s with %s should not trigger a device_alarm socket.io message if device has alarm', async (topic, message, done) => {
    const mqtt = new EventEmitter();
    const io = new EventEmitter();
    const server = new EventEmitter();

    await database.addDevice({
      name: 'Test Gerat',
      serialnumber: '0002145702154',
    });

    await database.setDeviceAlarm('0002145702154', true);
    await database.addFanState({
      device: '0002145702154',
      state: 'alarm',
      date: new Date(),
    });

    const device = await database.getDevice('0002145702154');
    console.log(device);

    register(server, database, io, mqtt);

    mqtt.emit('message', `UVClean/0002145702154/stateChanged/${topic}`, message);

    io.on('device_alarm', (prop) => {
      console.log(prop);
      done(new Error('device alarm was called, even though it should not'));
    });

    io.on('device_stateChanged', () => {
      done();
    });
  });
});

// describe('Iterating over different alarm states', () => {
//   const mqtt = new EventEmitter();
//   const io = new EventEmitter();
//   const server = new EventEmitter();
//   let group = null;
//   const deviceAlarm = jest.fn();
//   const groupAlarm = jest.fn();

//   beforeAll(async () => {
//     register(server, database, io, mqtt);
//     await database.addDevice({
//       name: 'Test Gerat',
//       serialnumber: '1',
//     });

//     await database.addDevice({
//       name: 'Test Gerat',
//       serialnumber: '2',
//     });

//     group = await database.addGroup({
//       name: 'Test Group',
//     });

//     await database.addDeviceToGroup('1', `${group._id}`);
//     await database.addDeviceToGroup('2', `${group._id}`);
//   });

//   afterEach(() => {
//     io.removeAllListeners('device_alarm');
//     io.removeAllListeners('group_deviceAlarm');
//     jest.clearAllMocks();
//   });

//   it.each([
//     ['alarm/1', 'Alarm', true],
//     ['alarm/1', 'Ok', false],
//     ['alarm/1', 'Ok', null],
//     ['alarm/1', 'Alarm', true],
//     ['alarm/1', 'Alarm', null],
//     ['alarm/2', 'Alarm', null],
//     ['alarm/1', 'Ok', null],
//     ['alarm/2', 'Ok', false],
//     ['alarm/1', 'Alarm', true],
//     ['alarm/1', 'Ok', false],
//     ['alarm/tempBody', 'Alarm', true],
//     ['alarm/tempBody', 'Ok', false],
//     ['alarm/tempFan', 'Alarm', true],
//     ['alarm/tempFan', 'Ok', false],
//     ['alarm/tempBody', 'Alarm', true],
//     ['alarm/tempBody', 'Ok', false],
//     ['alarm/tempFan', 'Alarm', true],
//     ['alarm/tempFan', 'Ok', false],
//     ['alarm/tempBody', 'Ok', null],
//     ['alarm/tempBody', 'Alarm', true],
//     ['alarm/tempBody', 'Alarm', null],
//     ['alarm/tempFan', 'Alarm', null],
//     ['alarm/tempBody', 'Alarm', null],
//     ['alarm/tempFan', 'Alarm', null],
//     ['alarm/tempBody', 'Ok', null],
//     ['alarm/tempFan', 'Ok', false],
//     ['alarm/tempBody', 'Ok', null],
//     ['alarm/tempFan', 'Ok', null],
//   ])('Device AlarmState: Setting topic %s to %s, expected devicealarm %s', (topic, message, deviceResult, done) => {
//     io.on('device_alarm', (option) => {
//       if (deviceResult === null) {
//         deviceAlarm();
//       } else {
//         try {
//           expect(option).toEqual({
//             alarmValue: deviceResult,
//             serialnumber: '1',
//           });
//         } catch (e) {
//           done(e);
//         }
//       }
//     });

//     mqtt.emit('message', `UVClean/1/stateChanged/${topic}`, message);

//     io.on('device_stateChanged', () => {
//       if (deviceResult === null) {
//         expect(deviceAlarm).not.toHaveBeenCalled();
//       }
//       done();
//     });
//   });

//   it.each([
//     ['1', 'alarm/1', 'Alarm', true],
//     ['1', 'alarm/1', 'Ok', false],
//     ['2', 'alarm/1', 'Ok', null],
//     ['2', 'alarm/1', 'Alarm', true],
//     ['1', 'alarm/1', 'Alarm', null],
//     ['1', 'alarm/2', 'Alarm', null],
//     ['2', 'alarm/1', 'Alarm', null],
//     ['2', 'alarm/2', 'Alarm', null],
//     ['1', 'alarm/1', 'Ok', null],
//     ['1', 'alarm/2', 'Ok', null],
//     ['2', 'alarm/1', 'Ok', null],
//     ['2', 'alarm/2', 'Ok', false],
//     ['1', 'alarm/tempBody', 'Alarm', true],
//     ['1', 'alarm/tempBody', 'Ok', false],
//     ['2', 'alarm/tempBody', 'Ok', null],
//     ['2', 'alarm/tempBody', 'Alarm', true],
//     ['1', 'alarm/tempBody', 'Alarm', null],
//     ['1', 'alarm/tempFan', 'Alarm', null],
//     ['2', 'alarm/tempBody', 'Alarm', null],
//     ['2', 'alarm/tempFan', 'Alarm', null],
//     ['1', 'alarm/tempBody', 'Ok', null],
//     ['1', 'alarm/tempFan', 'Ok', null],
//     ['2', 'alarm/tempBody', 'Ok', null],
//     ['2', 'alarm/tempFan', 'Ok', false],
//   ])('Group AlarmState: Setting device %s, topic %s to %s, expected groupalarm %s', (device, topic, message, groupResult, done) => {
//     io.on('group_deviceAlarm', (option) => {
//       if (groupResult === null) {
//         groupAlarm();
//       } else {
//         try {
//           expect(option).toEqual({
//             alarmValue: groupResult,
//             group: group._id.toString(),
//             serialnumber: device,
//           });
//         } catch (e) {
//           done(e);
//         }
//       }
//     });

//     mqtt.emit('message', `UVClean/${device}/stateChanged/${topic}`, message);

//     io.on('device_stateChanged', () => {
//       if (groupResult === null) {
//         expect(groupAlarm).not.toHaveBeenCalled();
//       }
//       done();
//     });
//   });
// });
