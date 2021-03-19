const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'AddDeviceToGroupCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: group_addDevice: %o', message);
  const { device, group } = message;

  if (device !== undefined && typeof device !== 'string') {
    throw new Error('Device must be defined and of type string');
  }

  if (group !== undefined && typeof group !== 'string') {
    throw new Error('Group must be defined and of type string');
  }

  await db.addDeviceToGroup(device, group);
  logger.info('added device %s to group %s, sending group_deviceAdded event', device, group);
  io.emit('group_deviceAdded');
  io.emit('info', { message: `Device  ${device} added to group ${group} added` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('group_addDevice', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'AddDeviceToGroupCommand', error: e });
    }
  });
};
