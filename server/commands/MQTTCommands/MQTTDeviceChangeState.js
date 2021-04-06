const MainLogger = require('../../Logger.js').logger;
const MQTTMessage = require('./MQTTMessage');
const { encrypt } = require('./middleware/encrypt');

const logger = MainLogger.child({ service: 'MQTT-ChangeState' });

module.exports = {
  /**
   * Executes an changeState MQTT command with sending the according mqtt message
   * @param {MqttClient} mqtt MQTT Client
   * @param {string} serialnumber Serialnumber of the device
   * @param {string} prop the propertie to be changed
   * @param {string} value the value to be send
   */
  execute: async (setting, mqtt, serialnumber, prop, value) => {
    logger.debug('sending mqtt changestate message for device %s, changeState with propertie %s and value %s', serialnumber, prop, value);

    await MQTTMessage.execute(setting, mqtt, serialnumber, `changeState/${prop}`, value);
  },
};
