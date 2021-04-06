const EventEmitter = require('events');
const register = require('../../../../server/commands/SocketIOCommands/GroupChangeState');
const MongoDBAdapter = require('../../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const Settings = require('../../../../server/dataModels/Settings');
const GroupChangeState = require('../../../../server/commands/GroupChangeState');

let database;

global.config = {
  mqtt: {
    useEncryption: false,
    secret: 'C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret',
  },
};

beforeAll(async () => {
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
  const setting = new Settings('UVCServerSetting');
  await database.addSettings(setting);
});

afterAll(async () => {
  await database.close();
});

describe('SocketIO GroupChangeState command', () => {
  beforeEach(async () => {
    await database.clearCollection('uvcdevices');
    await database.clearCollection('uvcgroups');
  });

  it.each([
    [{ prop: 'prop', newValue: 'newValue' }, 'id must be defined and of type string'],
    [{ id: 'id', newValue: 'newValue' }, 'Prop must be defined and of type string'],
    [{ prop: 'prop', id: 'id' }, 'New value must be defined and of type string'],
  ])('If prop object %o is passed, changeState throws error %s', async (prop, error, done) => {
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const server = new EventEmitter();

    register(server, database, io, undefined, ioSocket);
    server.on('error', (e) => {
      try {
        expect(e.error.message).toMatch(error);
        done();
      } catch (err) {
        done(err);
      }
    });
    ioSocket.emit('group_changeState', prop);
  });

  it('executes GroupChangeState command', (done) => {
    GroupChangeState.execute = jest.fn();
    const ioSocket = new EventEmitter();

    const newState = {
      id: '123456789',
      prop: 'engineState',
      newValue: 'true',
    };

    const server = new EventEmitter();

    register(server, undefined, undefined, undefined, ioSocket);
    server.on('error', (e) => {
      done(e);
    });
    ioSocket.emit('group_changeState', newState);
    expect(GroupChangeState.execute).toHaveBeenCalledWith(undefined, undefined, undefined, newState.id, newState.prop, newState.newValue);
    done();
  });
});
