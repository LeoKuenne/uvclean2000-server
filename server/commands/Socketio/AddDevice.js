const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'AddDeviceCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: device_add: %o', message);

  if (message.serialnumber !== undefined && typeof message.serialnumber !== 'string') {
    throw new Error('Serialnumber must be defined and of type string');
  }

  if (message.name !== undefined && typeof message.name !== 'string') {
    throw new Error('Name must be defined and of type string');
  }

  const device = {
    serialnumber: message.serialnumber,
    name: message.name,
  };

  if (device.name === '' || device.name.match(/[^0-9A-Za-z+ ]/gm) !== null) {
    throw new Error(`Name has to be vaild. Only numbers, letters and "+" are allowed.\n Invalid characters: ${device.name.match(/[^0-9A-Za-z+ ]/gm).join(',')}`);
  }

  if (device.serialnumber === '' || device.serialnumber.match(/[^0-9]/gm) !== null) {
    throw new Error(`Serialnumber has to be vaild. Only Numbers are allowed.\n Invalid characters: ${device.serialnumber.match(/[^0-9]/gm).join(',')}`);
  }

  await db.addDevice(device);
  await db.getDevice(device.serialnumber).then((databaseDevice) => {
    logger.debug('added Device to database, sending deviceAdded event');

    mqtt.subscribe(`UVClean/${databaseDevice.serialnumber}/#`);

    io.emit('device_added', databaseDevice);
    io.emit('info', { message: `Device  ${databaseDevice.serialnumber} with name ${databaseDevice.name} added` });
  });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('device_add', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'AddDeviceCommand', error: e });
    }
  });
};
