const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const User = require('../../dataModels/User');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UpdateUserroleCommand' });

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(oldName, newName) {
    logger.info('Executing UpdateUserroleCommand with old name: %s, new name: %s', oldName, newName);

    return database.updateUserroleOfUser(oldName, newName);
  },
};
