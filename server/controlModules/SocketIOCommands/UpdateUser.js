const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UpdateUserCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: user_update: %o', message);

  if (message.username !== undefined && typeof message.username !== 'string') {
    throw new Error('Username must be defined and of type string');
  }

  if (message.newUsername !== undefined && typeof message.newUsername !== 'string') {
    throw new Error('New username must be defined and of type string');
  }

  if (message.canEdit !== undefined && typeof message.canEdit !== 'boolean') {
    throw new Error('Can edit must be defined and of type boolean');
  }

  const user = {
    username: message.username,
    newUsername: message.newUsername,
    canEdit: message.canEdit,
  };

  if (user.username === '' || user.username.match(/[^a-zA-z0-9 ]/gm) !== null) {
    throw new Error(`Username has to be vaild. Only letters and numbers are allowed.\n Invalid characters: ${user.username.match(/[^a-zA-z0-9 ]/gm).join(',')}`);
  }

  await db.updateUser(user);
  const dbUser = await db.getUser(user.newUsername);

  logger.debug('user %s updated in database, sending user_updated message', user.newUsername);

  io.emit('user_updated', {
    username: user.username,
    newUsername: dbUser.username,
    canEdit: dbUser.canEdit,
  });
  io.emit('info', { message: `Updated user ${dbUser.username}` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('user_update', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'UpdateUserCommand', error: e });
    }
  });
};
