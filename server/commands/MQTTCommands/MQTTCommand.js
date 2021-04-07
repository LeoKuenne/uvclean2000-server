const MainLogger = require('../../Logger.js').logger;
const MQTTMessage = require('./MQTTMessage');

const logger = MainLogger.child({ service: 'MQTT-Command' });

module.exports = {
  /**
   * Executes an changeState MQTT command with sending the according mqtt message
   * @param {MqttClient} mqtt MQTT Client
   * @param {string} serialnumber Serialnumber of the device
   * @param {string} command the command to be sended
   * @param {string} value the value to be send
   */
  execute: async (mqtt, serialnumber, command, value) => {
    logger.debug('sending mqtt command %s for device %s, value %s', command, serialnumber, value);
    await MQTTMessage.execute(mqtt, serialnumber, command, value);
  },
};
