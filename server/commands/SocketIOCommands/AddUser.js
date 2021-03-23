const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'AddUserCommand' });

async function execute(db, io, mqtt, message) {
  logger.info('Event: user_add: %o', message);

  if (message.username !== undefined && typeof message.username !== 'string') {
    throw new Error('Username must be defined and of type string');
  }

  if (message.password !== undefined && typeof message.password !== 'string') {
    throw new Error('Password must be defined and of type string');
  }

  if (message.canEdit !== undefined && typeof message.canEdit !== 'boolean') {
    throw new Error('Can edit must be defined and of type boolean');
  }

  const user = {
    username: message.username,
    password: message.password,
    canEdit: message.canEdit,
  };

  if (user.username === '' || user.username.match(/[^a-zA-z0-9 ]/gm) !== null) {
    throw new Error(`Username has to be vaild. Only letters and numbers are allowed.\n Invalid characters: ${user.username.match(/[^a-zA-z0-9 ]/gm).join(',')}`);
  }

  await db.addUser(user);
  const dbUser = await db.getUser(user.username);

  logger.info('added User %s to database, sending user_added event', dbUser.username);

  io.emit('user_added', {
    username: dbUser.username,
    canEdit: dbUser.canEdit,
  });
  io.emit('info', { message: `User  ${user.username} added` });
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('user_add', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'AddUserCommand', error: e });
    }
  });
};
