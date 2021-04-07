const EventEmitter = require('events');
const GroupChangeState = require('../../../server/commands/GroupChangeState');
const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const Settings = require('../../../server/dataModels/Settings');

let database;

global.config = {
  mqtt: {
    useEncryption: false,
    sendEngineLevelWhenOn: false,
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

describe('GroupChangeState command', () => {
  beforeEach(async () => {
    await database.clearCollection('uvcdevices');
    await database.clearCollection('uvcgroups');
  });

  it('changeState with prop name changes name', async (done) => {
    const io = new EventEmitter();
    const mqtt = new EventEmitter();

    const group = await database.addGroup({ name: 'Test Group 1' });

    const newState = {
      id: group._id.toString(),
      prop: 'name',
      newValue: 'Test Group 2',
    };

    io.on('group_stateChanged', (prop) => {
      try {
        expect(prop).toEqual(newState);
        done();
      } catch (error) {
        done(error);
      }
    });

    await GroupChangeState.execute(database, io, mqtt, newState.id, newState.prop, newState.newValue);
  });

  it.each([
    ['eventMode', true],
    ['engineState', false],
    ['engineLevel', 1],
  ])('changeState with prop %s and value %s emits changeState mqtt message to all devices in the group', async (propertie, value, done) => {
    const io = new EventEmitter();
    let i = 1;
    const mqtt = {
      publish: (topic, message) => {
        try {
          expect(topic).toMatch(`UVClean/${i}/changeState/${propertie}`);
          expect(message).toMatch(value.toString());
          i += 1;
        } catch (e) {
          done(e);
        }
      },
    };

    const group = await database.addGroup({ name: 'Test Group 1' });
    await database.addDevice({ name: 'Device 1', serialnumber: '1' });
    await database.addDevice({ name: 'Device 2', serialnumber: '2' });
    await database.addDeviceToGroup('1', group._id.toString());
    await database.addDeviceToGroup('2', group._id.toString());

    const newState = {
      id: group._id.toString(),
      prop: propertie,
      newValue: value.toString(),
    };

    io.on('info', () => { done(); });

    await GroupChangeState.execute(database, io, mqtt, newState.id, newState.prop, newState.newValue);
  });

  it.each([
    ['eventMode', true],
    ['engineState', false],
    ['engineLevel', 1],
  ])('changeState with prop %s and value %s emits group_stateChanged event on socketio', async (propertie, value, done) => {
    const io = new EventEmitter();
    const server = new EventEmitter();
    const mqtt = {
      publish: jest.fn(),
    };

    const group = await database.addGroup({ name: 'Test Group 1' });
    await database.addDevice({ name: 'Device 1', serialnumber: '1' });
    await database.addDevice({ name: 'Device 2', serialnumber: '2' });
    await database.addDeviceToGroup('1', group._id.toString());
    await database.addDeviceToGroup('2', group._id.toString());

    const newState = {
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

    server.on('error', (error) => done(error.error));
    await GroupChangeState.execute(database, io, mqtt, newState.id, newState.prop, newState.newValue);
  });

  it.each([
    [true],
    [false],
  ])('changeState with prop engineState and value %s, true emits a second mqtt message for setting the current engineLevel, false does not', async (value, done) => {
    global.config.mqtt.sendEngineLevelWhenOn = true;
    const io = new EventEmitter();
    const server = new EventEmitter();
    const mqtt = {
      publish: jest.fn(),
    };

    const group = await database.addGroup({ name: 'Test Group 1' });
    await database.addDevice({ name: 'Device 1', serialnumber: '1' });
    await database.addDevice({ name: 'Device 2', serialnumber: '2' });

    await database.updateDevice({
      serialnumber: '1',
      engineLevel: 1,
    });

    await database.updateDevice({
      serialnumber: '2',
      engineLevel: 1,
    });

    await database.addDeviceToGroup('1', group._id.toString());
    await database.addDeviceToGroup('2', group._id.toString());

    const newState = {
      id: group._id.toString(),
      prop: 'engineState',
      newValue: value.toString(),
    };

    io.on('group_stateChanged', (options) => {
      setTimeout(() => {
        expect(mqtt.publish.mock.calls).toEqual((value) ? [
          ['UVClean/1/changeState/engineState', 'true'],
          ['UVClean/2/changeState/engineState', 'true'],
          ['UVClean/1/changeState/engineLevel', '1'],
          ['UVClean/2/changeState/engineLevel', '1'],
        ] : [
          ['UVClean/1/changeState/engineState', 'false'],
          ['UVClean/2/changeState/engineState', 'false'],
        ]);
        done();
      }, 1100);
    });

    server.on('error', (error) => done(error.error));
    await GroupChangeState.execute(database, io, mqtt, newState.id, newState.prop, newState.newValue);
  });
});
