const { updateDatabaseGroupDevicesWithOtherState } = require('../../../server/dataModels/UVCGroup');
const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');

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
    'engineState',
    'eventMode',
    'engineLevel',
  ])('updateDatabaseGroupDevicesWithOtherState updates the corret list for propertie %s in the group', async (prop) => {
    const db = {
      updateGroupDevicesWithOtherState: jest.fn(),
    };
    updateDatabaseGroupDevicesWithOtherState(db, 'TestGroup', prop, ['1', '2']);
    expect(db.updateGroupDevicesWithOtherState).toHaveBeenCalledWith('TestGroup', prop, ['1', '2']);
  });
});
