const MainLogger = require('../../Logger.js').logger;
const { encrypt } = require('./middleware/encrypt');

const logger = MainLogger.child({ service: 'MQTTCommandDeviceChangeState' });

module.exports = {
  /**
   * Executes an changeState MQTT command with sending the according mqtt message
   * @param {MqttClient} mqtt MQTT Client
   * @param {string} serialnumber Serialnumber of the device
   * @param {string} prop the propertie to be changed
   * @param {string} value the value to be send
   */
  execute: async (mqtt, serialnumber, prop, value) => {
    logger.debug('sending mqtt message for device %s, changeState with propertie %s and value %s', serialnumber, prop, value);
    const encryptedValue = (config.mqtt.useEncryption) ? await encrypt(value) : null;
    mqtt.publish(`UVClean/${serialnumber}/changeState/${prop}`, (config.mqtt.useEncryption) ? encryptedValue : value);
  },
};
