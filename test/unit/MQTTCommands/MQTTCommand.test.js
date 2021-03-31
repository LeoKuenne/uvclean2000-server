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
  publish: jest.fn(),
};

beforeAll(async () => {
});

afterAll(async () => {
});

describe('MQTT Command unit', () => {
  describe('Without encryption', () => {
    beforeAll(() => {
      config.mqtt.useEncryption = false;
      mqtt.publish = jest.fn();
    });

    beforeEach(() => {
      mqtt.publish.mockClear();
    });

    it('Sends an mqtt message with serialnumber, command and prop', async () => {
      await MQTTCommand.execute(undefined, mqtt, '1', 'changeState', 'engineState', false);
      expect(mqtt.publish.mock.calls).toEqual([
        ['UVClean/1/changeState/engineState', 'false'],
      ]);
    });

    it('Sends an mqtt message with serialnumber and command', async () => {
      await MQTTCommand.execute(undefined, mqtt, '1', 'acknowledge', undefined, false);
      expect(mqtt.publish.mock.calls).toEqual([
        ['UVClean/1/acknowledge', 'false'],
      ]);
    });
  });

  describe('With encryption', () => {
    beforeAll(() => {
      config.mqtt.useEncryption = true;
    });

    it('Sends an mqtt message with serialnumber, command and prop', async (done) => {
      mqtt.publish = async (topic, message) => {
        expect(topic).toMatch('UVClean/1/changeState/engineState');
        const decode = decodeFernetToken(message, config.mqtt.secret);
        expect(decode).toMatch('false');
        done();
      };
      await MQTTCommand.execute(undefined, mqtt, '1', 'changeState', 'engineState', false);
    });

    it('Sends an mqtt message with serialnumber and command', async (done) => {
      mqtt.publish = async (topic, message) => {
        expect(topic).toMatch('UVClean/1/acknowledge');
        const decode = await decodeFernetToken(message, config.mqtt.secret);
        expect(decode).toMatch('false');
        done();
      };
      await MQTTCommand.execute(undefined, mqtt, '1', 'acknowledge', undefined, false);
    });
  });
});
