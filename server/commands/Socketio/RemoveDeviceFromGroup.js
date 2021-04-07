const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'RemoveDeviceFromGroupCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: group_deviceDelete: %o', message);
  const { device, group } = message;

  if ((device !== undefined && typeof device !== 'string') || device === '') {
    throw new Error('Device must be defined and of type string');
  }

  if ((group !== undefined && typeof group !== 'string') || group === '') {
    throw new Error('Group must be defined and of type string');
  }

  await db.deleteDeviceFromGroup(device, group);

  logger.debug('deleted device %s from group %s, sending group_deviceDeleted message', device, group);
  io.emit('group_deviceDeleted');
  io.emit('info', { message: `Removed device ${device} from group ${group} deleted` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('group_deviceDelete', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'RemoveDeviceFromGroupCommand', error: e });
    }
  });
};
