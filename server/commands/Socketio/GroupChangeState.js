const MainLogger = require('../../Logger.js').logger;
const GroupChangeState = require('../GroupChangeState');

const logger = MainLogger.child({ service: 'SocketIOGroupChangeStateCommand' });

async function execute(db, io, mqtt, message) {
  if (message.id === undefined || typeof message.id !== 'string') {
    throw new Error('id must be defined and of type string');
  }

  if (message.prop === undefined || typeof message.prop !== 'string') {
    throw new Error('Prop must be defined and of type string');
  }

  if (message.newValue === undefined || typeof message.newValue !== 'string') {
    throw new Error('New value must be defined and of type string');
  }

  await GroupChangeState.execute(db, io, mqtt, message.id, message.prop, message.newValue);
}

module.exports = function register(server, db, io, mqtt, ioSocket) {
  logger.info('Registering socketIO module');
  ioSocket.on('group_changeState', async (message) => {
    try {
      await execute(db, io, mqtt, message);
    } catch (e) {
      server.emit('error', { service: 'GroupChangeStateCommand', error: e });
    }
  });
};
