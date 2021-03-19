const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'AddGroupCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: group_add: %o', message);

  if (message.name !== undefined && typeof message.name !== 'string') {
    throw new Error('Name must be defined and of type string');
  }

  const group = {
    name: message.name,
  };

  if (group.name === '' || group.name.match(/[^0-9A-Za-z+ ]/gm) !== null) {
    throw new Error(`Name has to be vaild. Only numbers, letters and "+" are allowed.\n Invalid characters: ${group.name.match(/[^0-9A-Za-z+ ]/gm).join(',')}`);
  }

  const docGroup = await db.addGroup(group);
  await db.getGroup(`${docGroup._id}`).then((databaseGroup) => {
    logger.info('added group %s to database, sending group_added event', docGroup._id);

    io.emit('group_added', databaseGroup);
    io.emit('info', { message: `Group  ${databaseGroup._id} with name ${databaseGroup.name} added` });
  });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('group_add', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'AddGroupCommand', error: e });
    }
  });
};
