const { getDevicesWithWrongState, updateGroupDevicesWithOtherState } = require('../../server/dataModels/UVCGroup');
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
    [true, false, false],
    [false, true, false],
    [true, true, false],
    [false, false, false],
    [true, false, true],
    [false, true, true],
    [true, true, true],
    [false, false, true],
  ])('function getDevicesWithWrongState returns all devices (device 1: %s, device 2: %s) that have not a engineState of %s', async (deviceState1, deviceState2, groupState) => {
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

    const devicesWrongState = await getDevicesWithWrongState(group,
      'engineState', database);

    expect(devicesWrongState.length)
      .toBe([deviceState1, deviceState2].filter((b) => b !== groupState).length);

    if (deviceState1 !== groupState && deviceState2 === groupState) {
      expect(devicesWrongState[0].serialnumber).toMatch('1');
    } else if (deviceState1 === groupState && deviceState2 !== groupState) {
      expect(devicesWrongState[0].serialnumber).toMatch('2');
    } else if (deviceState1 !== groupState && deviceState2 !== groupState) {
      expect(devicesWrongState[0].serialnumber).toMatch('1');
      expect(devicesWrongState[1].serialnumber).toMatch('2');
    }
  });

  it.each([
    'engineState',
    'eventMode',
    'engineLevel',
  ])('updateGroupState updates the corret list for propertie %s in the group', async (prop) => {
    const db = {
      updateGroupDevicesWithOtherState: jest.fn(),
    };

    updateGroupDevicesWithOtherState(db, 'TestGroup', prop, ['1', '2']);
    expect(db.updateGroupDevicesWithOtherState).toHaveBeenCalledWith('TestGroup', prop, ['1', '2']);
  });
});
