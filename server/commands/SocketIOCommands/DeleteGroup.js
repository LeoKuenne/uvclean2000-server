const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'DeleteGroupCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: group_delete: %o', message);

  if (message.id !== undefined && typeof message.id !== 'string') {
    throw new Error('Name must be defined and of type string');
  }

  const group = {
    id: message.id,
  };

  const dbGroup = await db.deleteGroup(group);
  const docGroup = await db.getGroup(`${dbGroup.id}`).catch((e) => {
    if (e.message === 'Group does not exists') {
      logger.debug('deleted group from database, sending group_deleted event');

      io.emit('group_deleted', { id: group.id });
      io.emit('info', { message: `Group  ${group.id} deleted` });
    }
  });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('group_delete', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'DeleteGroupCommand', error: e });
    }
  });
};
