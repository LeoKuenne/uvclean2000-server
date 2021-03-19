const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'DeleteUserCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: user_delete: %o', message);

  if ((message.username !== undefined && typeof message.username !== 'string') || message.username.length <= 5) {
    throw new Error('Username must be defined and of type string');
  }

  const user = {
    username: message.username,
  };

  await db.deleteUser(user.username);
  logger.debug('deleted user from database, sending user_deleted event');
  io.emit('user_deleted', { username: user.username });
  io.emit('info', { message: `User  ${user.username} deleted` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('user_delete', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'DeleteUserCommand', error: e });
    }
  });
};
