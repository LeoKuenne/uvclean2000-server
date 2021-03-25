const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const User = require('../../dataModels/User');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UpdateUserroleNameCommand' });

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
    logger.info('Executing UpdateUserroleNameCommand with old name: %s, new name: %s', oldName, newName);

    const userrole = await database.getUserrole(oldName);
    userrole.name = newName;

    return database.updateUserrole(oldName, userrole);
  },
};
