const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'SetDevicesInGroup' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: group_setDevices: %o', message);
  const { devices, group } = message;

  if (devices !== undefined && !Array.isArray(devices)) {
    throw new Error('Device must be defined and of type string');
  }

  if (group !== undefined && typeof group !== 'string') {
    throw new Error('Group must be defined and of type string');
  }

  const devicesToSet = [...devices];

  const dbGroup = await db.getGroup(group);

  await Promise.all(dbGroup.devices.map(async (deviceInGroup) => {
    if (!devicesToSet.includes(deviceInGroup.serialnumber)) {
      await db.deleteDeviceFromGroup(deviceInGroup.serialnumber, dbGroup.id.toString());
      return;
    }
    const index = devicesToSet.indexOf(deviceInGroup.serialnumber);
    if (index > -1) {
      devicesToSet.splice(index, 1);
    }
  }));

  await Promise.all(devicesToSet.map(async (dev) => {
    await db.addDeviceToGroup(dev, dbGroup.id.toString());
  }));

  logger.debug('set devices in group %s, sending group_deviceAdded message', group.id);
  io.emit('group_deviceAdded');
  io.emit('info', { message: `Setted devices to group ${dbGroup.name}` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('group_setDevices', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'SetDevicesInGroup', error: e });
    }
  });
};
