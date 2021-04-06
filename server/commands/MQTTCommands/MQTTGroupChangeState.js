const MainLogger = require('../../Logger.js').logger;
const MQTTDeviceChangeState = require('./MQTTDeviceChangeState');

const logger = MainLogger.child({ service: 'MQTTCommandGroupChangeState' });

module.exports = {
  /**
   * Executes an changeState MQTT command with sending the according mqtt message
   * @param {MqttClient} mqtt MQTT Client
   * @param {Object} group group name to change
   * @param {string} prop the propertie to be changed
   * @param {string} value the value to be send
   */
  execute: async (mqtt, group, prop, value) => {
    await Promise.all(group.devices.map(async (device) => {
      logger.debug('sending mqtt message for device %s, changeState with propertie %s and value %s', device.serialnumber, prop, value);
      await MQTTDeviceChangeState.execute(mqtt, device.serialnumber, prop, value);
    }));

    if (config.mqtt.sendEngineLevelWhenOn && prop === 'engineState' && value === 'true') {
      await Promise.all(group.devices.map(async (device) => {
        logger.debug('Device is turning on, sending change engineLevel state to with value %s', device.serialnumber, device.engineLevel);
        await MQTTDeviceChangeState.execute(mqtt, device.serialnumber, 'engineLevel', device.engineLevel.toString());
      }));
    }
  },
};
