const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const User = require('../../dataModels/User');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'ChangeUserUserroleCommand' });

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(username, userrole) {
    logger.info('Executing ChangeUserUserroleCommand with username: %s, userrole: %s', username, userrole);

    return database.updateUserrole(username, userrole);
  },
};
