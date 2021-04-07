const MQTTCommand = require('../../../server/commands/MQTTCommands/MQTTCommand');
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
  publish: {},
};

beforeAll(async () => {
});

afterAll(async () => {
});

describe.each([
  true,
  false,
])('MQTT Command unit', (encryption) => {
  describe((encryption) ? 'With encryption' : 'Without encryption', () => {
    beforeAll(() => {
      config.mqtt.useEncryption = encryption;
    });

    it.each([
      'acknowledge',
      'reset',
      'test/ 123 ',
    ])('Sends an mqtt message with command %s', async (path, done) => {
      mqtt.publish = async (topic, message) => {
        expect(topic).toEqual(`UVClean/1/${path}`);
        if (encryption) {
          const decode = await decodeFernetToken(message, config.mqtt.secret);
          expect(decode).toEqual('false');
        } else {
          expect(message).toEqual('false');
        }
        done();
      };
      await MQTTCommand.execute(mqtt, '1', path, false);
    });
  });
});
