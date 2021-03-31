const EventEmitter = require('events');
const AcknowledgeDeviceAlarm = require('../../../server/commands/SocketIOCommands/AcknowledgeDeviceAlarm');
const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const { decodeFernetToken } = require('../../TestUtitities');

let database = null;

global.config = {
  mqtt: {
    useEncryption: false,
    secret: 'C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret',
    useTTL: false,
    ttl: 1,
  },
};

beforeAll(async () => {
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
  await database.addDevice({ serialnumber: '1', name: 'Test' });
});

afterAll(async () => {
  await database.close();
});

describe('AcknowledgeDeviceAlarm', () => {
  describe('Without encryption', () => {
    beforeAll(() => {
      config.mqtt.useEncryption = false;
    });

    it('Sends mqtt message without encryption to acknowledge the alarm', async (done) => {
      const server = new EventEmitter();
      const io = new EventEmitter();
      const mqtt = {
        publish: (topic, message) => {
          try {
            expect(topic).toEqual('UVClean/1/acknowledge');
            expect(message).toEqual('true');
            done();
          } catch (error) {
            done(error);
          }
        },
      };
      const ioSocket = new EventEmitter();

      AcknowledgeDeviceAlarm(server, database, io, mqtt, ioSocket);
      ioSocket.emit('device_acknowledgeAlarm', { serialnumber: '1' });
    });
  });

  describe('With encryption', () => {
    beforeAll(() => {
      config.mqtt.useEncryption = true;
    });

    it('Sends mqtt message withencryption to acknowledge the alarm', async (done) => {
      const server = new EventEmitter();
      const io = new EventEmitter();
      const mqtt = {
        publish: (topic, message) => {
          try {
            expect(topic).toEqual('UVClean/1/acknowledge');
            const decode = decodeFernetToken(message, config.mqtt.secret);
            expect(decode).toEqual('true');
            done();
          } catch (error) {
            done(error);
          }
        },
      };
      const ioSocket = new EventEmitter();

      AcknowledgeDeviceAlarm(server, database, io, mqtt, ioSocket);
      ioSocket.emit('device_acknowledgeAlarm', { serialnumber: '1' });
    });
  });
});
