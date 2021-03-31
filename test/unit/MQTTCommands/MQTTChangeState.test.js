const MQTTChangeState = require('../../../server/commands/MQTTCommands/MQTTChangeState');
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
])('MQTT ChangeState send an mqtt message', (encryption) => {
  describe((encryption) ? 'With encryption' : 'Without encryption', () => {
    beforeAll(() => {
      config.mqtt.useEncryption = encryption;
    });

    it.each([
      ['engineState', 'true'],
      ['engineLevel', '1'],
    ])('with propertie %s', async (path, value, done) => {
      mqtt.publish = async (topic, message) => {
        try {
          expect(topic).toEqual(`UVClean/1/changeState/${path}`);
          if (encryption) {
            const decode = await decodeFernetToken(message, config.mqtt.secret);
            expect(decode).toEqual(value);
          } else {
            expect(message).toEqual(value);
          }
          done();
        } catch (error) {
          done(error);
        }
      };
      await MQTTChangeState.execute(undefined, mqtt, '1', path, value);
    });
  });
});
