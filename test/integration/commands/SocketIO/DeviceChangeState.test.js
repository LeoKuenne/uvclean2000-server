const EventEmitter = require('events');
const DeviceChangeState = require('../../../../server/commands/Socketio/DeviceChangeState');
const MongoDBAdapter = require('../../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const Settings = require('../../../../server/dataModels/Settings');

let database;

global.config = {
  mqtt: {
    useEncryption: false,
    secret: 'C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret',
    sendEngineLevelWhenOn: true,
    sendEngineLevelWhenOnDelay: 1,
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

describe('DeviceChangeState Module', () => {
  beforeEach(async () => {
    await database.clearCollection('uvcdevices');
    await database.clearCollection('uvcgroups');
  });

  it.each([
    [{ prop: 'prop', newValue: 'newValue' }, 'Serialnumber must be defined and of type string'],
    [{ serialnumber: 'serialnumber', newValue: 'newValue' }, 'Prop must be defined and of type string'],
    [{ prop: 'prop', serialnumber: 'serialnumber' }, 'New value must be defined and of type string'],
  ])('If prop object %o is passed, changeState throws error %s', async (prop, error, done) => {
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const mqtt = new EventEmitter();
    const server = new EventEmitter();

    DeviceChangeState(server, database, io, mqtt, ioSocket);
    server.on('error', (e) => {
      try {
        expect(e.error.message).toMatch(error);
        done();
      } catch (err) {
        done(err);
      }
    });
    ioSocket.emit('device_changeState', prop);
  });

  it('changeState with prop name changes name', async (done) => {
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const mqtt = {
      publish: jest.fn(),
    };
    const server = new EventEmitter();

    const device1 = await database.addDevice({ name: 'Device 1', serialnumber: '1' });
    DeviceChangeState(server, database, io, mqtt, ioSocket);

    const prop = {
      serialnumber: device1.serialnumber,
      prop: 'name',
      newValue: 'Test Device 2',
    };

    io.on('info', () => {
      try {
        expect(mqtt.publish).toHaveBeenCalledWith('UVClean/1/changeState/name', prop.newValue);
        done();
      } catch (error) {
        done(error);
      }
    });

    server.on('error', (e) => {
      done(e.error);
    });

    ioSocket.emit('device_changeState', prop);
  });

  it.each([
    ['eventMode', true],
    ['engineState', false],
    ['engineLevel', 1],
  ])('changeState with prop %s and value %s emits changeState to device', async (propertie, value, done) => {
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const mqtt = {
      publish: jest.fn(),
    };
    const server = new EventEmitter();

    const device1 = await database.addDevice({ name: 'Device 1', serialnumber: '1' });
    DeviceChangeState(server, database, io, mqtt, ioSocket);

    const prop = {
      serialnumber: device1.serialnumber,
      prop: propertie,
      newValue: value.toString(),
    };

    io.on('info', () => {
      try {
        expect(mqtt.publish).toHaveBeenCalledWith(`UVClean/1/changeState/${propertie}`, prop.newValue);
        done();
      } catch (error) {
        done(error);
      }
    });

    server.on('error', (e) => {
      done(e.error);
    });

    ioSocket.emit('device_changeState', prop);
  });

  it.each([
    [true],
    [false],
  ])('changeState emits a second mqtt message after sendEndingeLevenWhenOnDelay for engineLevel if sendEndingeLevenWhenOn is true when device is turning on, device state is %s', async (value, done) => {
    global.config.mqtt.sendEngineLevelWhenOn = true;
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const mqtt = {
      publish: jest.fn(),
    };
    const server = new EventEmitter();

    const device1 = await database.addDevice({ name: 'Device 1', serialnumber: '1' });

    await database.updateDevice({
      serialnumber: '1',
      engineLevel: 1,
    });

    DeviceChangeState(server, database, io, mqtt, ioSocket);

    const prop = {
      serialnumber: device1.serialnumber,
      prop: 'engineState',
      newValue: value.toString(),
    };

    io.on('info', () => {
      setTimeout(() => {
        try {
          expect(mqtt.publish.mock.calls).toEqual((value) ? [
            ['UVClean/1/changeState/engineState', prop.newValue],
            ['UVClean/1/changeState/engineLevel', '1'],
          ] : [
            ['UVClean/1/changeState/engineState', prop.newValue],
          ]);
          done();
        } catch (error) {
          done(error);
        }
      }, global.config.mqtt.sendEngineLevelWhenOnDelay * 1000);
    });

    server.on('error', (e) => {
      done(e.error);
    });

    ioSocket.emit('device_changeState', prop);
  });

  it.each([
    [true],
    [false],
  ])('changeState does not emit an engineLevel message if sendEngineLevelWhenOn is false and device is turning on, device state is %s', async (value, done) => {
    global.config.mqtt.sendEngineLevelWhenOn = false;
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();
    const mqtt = {
      publish: jest.fn(),
    };
    const server = new EventEmitter();

    const device1 = await database.addDevice({ name: 'Device 1', serialnumber: '1' });

    await database.updateDevice({
      serialnumber: '1',
      engineLevel: 1,
    });

    DeviceChangeState(server, database, io, mqtt, ioSocket);

    const prop = {
      serialnumber: device1.serialnumber,
      prop: 'engineState',
      newValue: value.toString(),
    };

    io.on('info', () => {
      try {
        expect(mqtt.publish.mock.calls).toEqual([
          ['UVClean/1/changeState/engineState', prop.newValue],
        ]);
        done();
      } catch (error) {
        done(error);
      }
    });

    server.on('error', (e) => {
      done(e.error);
    });

    ioSocket.emit('device_changeState', prop);
  });
});
