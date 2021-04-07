const MainLogger = require('../../Logger.js').logger;
const { encrypt } = require('./middleware/encrypt');

const logger = MainLogger.child({ service: 'MQTT-Message' });

module.exports = {
  /**
   * Executes an changeState MQTT message with sending the according mqtt message
   * @param {Settings} setting Settings object
   * @param {MqttClient} mqtt MQTT Client
   * @param {string} serialnumber Serialnumber of the device
   * @param {string} path the path to send
   * @param {string} value the value to be send
   */
  execute: async (mqtt, serialnumber, path, value) => {
    logger.debug('sending mqtt message %s for device %s, value %s', path, serialnumber, value.toString());
    const encryptedValue = (global.config.mqtt.useEncryption) ? await encrypt(value.toString()) : null;
    mqtt.publish(`UVClean/${serialnumber}/${path}`, (global.config.mqtt.useEncryption) ? encryptedValue : value.toString());
  },
};
