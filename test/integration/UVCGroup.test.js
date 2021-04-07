const EventEmitter = require('events');
const { updateGroupDevicesWithOtherState } = require('../../server/dataModels/UVCGroup');
const MongoDBAdapter = require('../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');

describe('Group update functions', () => {
  let database = null;

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
  });

  it.each([
    ['engineState', true, false, false, ['1']],
    ['engineState', false, true, false, ['2']],
    ['engineState', true, true, false, ['1', '2']],
    ['engineState', false, false, false, []],
    ['engineState', true, false, true, ['2']],
    ['engineState', false, true, true, ['1']],
    ['engineState', true, true, true, []],
    ['engineState', false, false, true, ['1', '2']],
  ])('function updateGroupStates sets DeviceWithOtherState list of prop %s (device 1 is %s, device 2 is %s), group is %s, result list is %o', async (prop, deviceState1, deviceState2, groupState, newList, done) => {
    const io = new EventEmitter();

    const dev1 = await database.addDevice({
      serialnumber: '1',
      name: 'Test Device 1',
      engineState: deviceState1,
    });

    const dev2 = await database.addDevice({
      serialnumber: '2',
      name: 'Test Device 2',
      engineState: deviceState2,
    });

    let group = await database.addGroup({
      name: 'Test Group',
      engineState: groupState,
    });

    await database.addDeviceToGroup('1', group._id.toString());
    await database.addDeviceToGroup('2', group._id.toString());
    group = await database.getGroup(group._id.toString());

    const deviceList = [];
    newList.map((device) => {
      if (device === '1') { deviceList.push({ name: dev1.name, _id: dev1._id, serialnumber: dev1.serialnumber }); }
      if (device === '2') { deviceList.push({ name: dev2.name, _id: dev2._id, serialnumber: dev2.serialnumber }); }
    });

    io.on('group_devicesWithOtherStateChanged', (newState) => {
      try {
        expect(newState.prop).toMatch(`${prop}DevicesWithOtherState`);
        expect(newState.newValue).toEqual(deviceList);
        done();
      } catch (error) {
        done(error);
      }
    });

    await updateGroupDevicesWithOtherState(group.id.toString(), prop, database, io);
  });
});
