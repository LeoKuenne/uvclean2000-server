const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'DeleteUserroleCommand' });

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(username) {
    logger.info('Executing DeleteUserCommand with username: %s', username);

    return database.deleteUser(username);
  },
};
