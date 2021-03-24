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
  async execute(userrolename) {
    logger.info('Executing DeleteUserroleCommand with userrolename: %s', userrolename);

    return database.deleteUserrole(userrolename);
  },
};
