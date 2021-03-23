const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UpdateUserPassword' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: user_updatePassword: %o', message);

  if ((message.username !== undefined && typeof message.username !== 'string')) {
    throw new Error('Username must be defined and of type string');
  }

  if ((message.oldPassword !== undefined && typeof message.oldPassword !== 'string')) {
    throw new Error('Old Password must be defined and of type string');
  }

  if ((message.newPassword !== undefined && typeof message.newPassword !== 'string')) {
    throw new Error('New Password must be defined and of type string');
  }

  const user = {
    username: message.username,
    oldPassword: message.oldPassword,
    newPassword: message.newPassword,
  };

  await db.changeUserPassword(user);

  logger.debug('password of user %s updated in database', user.username);

  io.emit('info', { message: `Changed password for user ${user.username}` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('user_updatePassword', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'UpdateUserPassword', error: e });
    }
  });
};
