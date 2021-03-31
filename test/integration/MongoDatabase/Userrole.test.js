const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const Userrole = require('../../../server/dataModels/Userrole.js');

let database = null;

beforeAll(async () => {
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
});

afterAll(async () => {
  await database.close();
});

beforeEach(async () => {
  database.clearCollection('userroles');
});

it('canEditUserrole returns true if userrole admin can edit userrole guest', async () => {
  await database.addUserrole(new Userrole('Admin', Userrole.getUserroleRightsObject(true)));
  await database.addUserrole(new Userrole('Guest', Userrole.getUserroleRightsObject(true), ['Admin']));

  const b = await Userrole.canUserroleEditUserrole('Admin', 'Guest', database);
  expect(b).toBe(true);
});

it('canEditUserrole returns false if userrole admin can not edit userrole guest', async () => {
  await database.addUserrole(new Userrole('Admin', Userrole.getUserroleRightsObject(true)));
  await database.addUserrole(new Userrole('Guest', Userrole.getUserroleRightsObject(true)));

  const b = await Userrole.canUserroleEditUserrole('Admin', 'Guest', database);
  expect(b).toBe(false);
});
