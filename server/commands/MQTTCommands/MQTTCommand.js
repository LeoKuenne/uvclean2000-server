const MainLogger = require('../../Logger.js').logger;
const { encrypt } = require('./middleware/encrypt');

const logger = MainLogger.child({ service: 'MQTT-Command-ChangeState' });

module.exports = {
  /**
   * Executes an changeState MQTT command with sending the according mqtt message
   * @param {Settings} setting Settings object
   * @param {MqttClient} mqtt MQTT Client
   * @param {string} serialnumber Serialnumber of the device
   * @param {string} prop the propertie to be changed
   * @param {string} value the value to be send
   */
  execute: async (setting, mqtt, serialnumber, command, prop, value) => {
    logger.debug('sending mqtt message for device %s, changeState with propertie %s and value %s', serialnumber, prop, value.toString());
    const encryptedValue = (config.mqtt.useEncryption) ? await encrypt(value.toString()) : null;
    mqtt.publish(`UVClean/${serialnumber}/${command}${(prop) ? `/${prop}` : ''}`, (config.mqtt.useEncryption) ? encryptedValue : value.toString());
  },
};
