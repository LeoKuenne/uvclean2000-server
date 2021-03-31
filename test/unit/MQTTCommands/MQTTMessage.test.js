const MQTTMessage = require('../../../server/commands/MQTTCommands/MQTTMessage');
const { decodeFernetToken } = require('../../TestUtitities');

global.config = {
  mqtt: {
    useEncryption: false,
    secret: 'C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret',
    useTTL: false,
    ttl: 1,
  },
};

const mqtt = {
  publish: jest.fn(),
};

beforeAll(async () => {
});

afterAll(async () => {
});

describe.each([
  true,
  false,
])('MQTT Message unit', (encryption) => {
  describe((encryption) ? 'With encryption' : 'Without encryption', () => {
    beforeAll(() => {
      config.mqtt.useEncryption = encryption;
    });

    it.each([
      ['acknowledge', 'false'],
      ['changeState', 'false'],
      ['changeState/engineState', 'false'],
      ['changeState/alarm/1', 'Alarm'],
    ])('Sends an mqtt message with command %s and value %s', async (path, value, done) => {
      mqtt.publish = async (topic, message) => {
        expect(topic).toEqual(`UVClean/1/${path}`);
        if (encryption) {
          const decode = await decodeFernetToken(message, config.mqtt.secret);
          expect(decode).toEqual(value);
        } else {
          expect(message).toEqual(value);
        }
        done();
      };
      await MQTTMessage.execute(undefined, mqtt, '1', path, value);
    });
  });
});
