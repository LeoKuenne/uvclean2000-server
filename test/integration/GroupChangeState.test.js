const EventEmitter = require('events');
const UVCGroup = require('../../server/dataModels/UVCGroup');
const register = require('../../server/controlModules/SocketIOCommands/GroupChangeState');
const MongoDBAdapter = require('../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');

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
});

afterAll(async () => {
  await database.close();
});

describe('GroupChangeState Module', () => {
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
    const mqtt = new EventEmitter();
    const server = new EventEmitter();

    register(server, database, io, mqtt, ioSocket);
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

  it('changeState with prop name changes name', async (done) => {
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const mqtt = new EventEmitter();
    const server = new EventEmitter();

    const group = await database.addGroup({ name: 'Test Group 1' });
    register(server, database, io, mqtt, ioSocket);

    const prop = {
      id: group._id.toString(),
      prop: 'name',
      newValue: 'Test Group 2',
    };

    io.on('group_stateChanged', (newState) => {
      try {
        expect(newState).toEqual(prop);
        done();
      } catch (error) {
        done(error);
      }
    });

    ioSocket.emit('group_changeState', prop);
  });

  it.each([
    ['engineState', true],
    ['engineLevel', 1],
  ])('changeState with prop %s and value %s emits changeState to all devices in the group', async (prop, value, done) => {
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const server = new EventEmitter();
    let i = 1;

    const mqtt = {
      publish: async (topic, message) => {
        try {
          expect(topic).toMatch(`UVClean/${i}/changeState/${prop}`);
          expect(message).toMatch(value.toString());
          if (i === 2) {
            const g = await database.getGroup(group._id.toString());
            expect(g[prop]).toBe(value);
            // done();
          }
          i += 1;
        } catch (e) {
          done(e);
        }
      },
    };

    const group = await database.addGroup({ name: 'Test Group 1' });
    const device1 = await database.addDevice({ name: 'Device 1', serialnumber: '1' });
    const device2 = await database.addDevice({ name: 'Device 2', serialnumber: '2' });
    await database.addDeviceToGroup('1', `${group._id}`);
    await database.addDeviceToGroup('2', `${group._id}`);

    register(server, database, io, mqtt, ioSocket);

    const newState = {
      id: group._id.toString(),
      prop,
      newValue: value.toString(),
    };

    io.on('info', () => { done(); });

    ioSocket.emit('group_changeState', newState);
  });

  it.each([
    ['eventMode', true],
    ['engineState', true],
    ['engineLevel', 1],
  ])('changeState with prop %s and value %s emits changeState to all devices in the group', async (propertie, value, done) => {
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const server = new EventEmitter();
    let i = 1;
    const mqtt = {
      publish: async (topic, message) => {
        try {
          expect(topic).toMatch(`UVClean/${i}/changeState/${propertie}`);
          expect(message).toMatch(value.toString());
          if (i === 2) {
            const g = await database.getGroup(group._id.toString());
            expect(g[propertie]).toBe(value);
          }
          i += 1;
        } catch (e) {
          done(e);
        }
      },
    };

    const group = await database.addGroup({ name: 'Test Group 1' });
    const device1 = await database.addDevice({ name: 'Device 1', serialnumber: '1' });
    const device2 = await database.addDevice({ name: 'Device 2', serialnumber: '2' });
    await database.addDeviceToGroup('1', group._id.toString());
    await database.addDeviceToGroup('2', group._id.toString());

    register(server, database, io, mqtt, ioSocket);

    const prop = {
      id: group._id.toString(),
      prop: propertie,
      newValue: value.toString(),
    };

    io.on('info', () => { done(); });

    ioSocket.emit('group_changeState', prop);
  });

  it.each([
    ['eventMode', true],
    ['engineState', true],
    ['engineLevel', 1],
  ])('changeState with prop %s and value %s emits group_stateChanged event on socketio', async (propertie, value, done) => {
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const server = new EventEmitter();
    const mqtt = {
      publish: jest.fn(),
    };

    const group = await database.addGroup({ name: 'Test Group 1' });
    const device1 = await database.addDevice({ name: 'Device 1', serialnumber: '1' });
    const device2 = await database.addDevice({ name: 'Device 2', serialnumber: '2' });
    await database.addDeviceToGroup('1', group._id.toString());
    await database.addDeviceToGroup('2', group._id.toString());

    register(server, database, io, mqtt, ioSocket);

    const prop = {
      id: group._id.toString(),
      prop: propertie,
      newValue: value.toString(),
    };

    io.on('group_stateChanged', (options) => {
      expect(options).toEqual({
        id: group._id.toString(),
        prop: propertie,
        newValue: value.toString(),
      });
      done();
    });

    ioSocket.emit('group_changeState', prop);
  });
});
