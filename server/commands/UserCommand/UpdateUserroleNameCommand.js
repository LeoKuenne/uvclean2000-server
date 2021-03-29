const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const AuthenticationError = require('../../errors/AuthenticationError');
const Userrole = require('../../dataModels/Userrole');
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
  async execute(usernameActionPerformedBy, oldName, newName) {
    logger.info('Executing UpdateUserroleNameCommand with old name: %s, new name: %s', oldName, newName);

    const user = await database.getUser(usernameActionPerformedBy);

    if (!await Userrole.canUserroleEditUserrole(user.userrole.name, oldName, database)) {
      throw new AuthenticationError(user.userrole.name, `Userrole ${user.userrole.name} can not change userrole ${oldName}`);
    }

    const userrole = await database.getUserrole(oldName);
    userrole.name = newName;

    return database.updateUserrole(oldName, userrole);
  },
};
