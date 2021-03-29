const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const AuthenticationError = require('../../errors/AuthenticationError');
const Userrole = require('../../dataModels/Userrole');
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
  async execute(usernameActionPerformedBy, userrole) {
    logger.info('Executing DeleteUserroleCommand with userrole: %s', userrole);

    const user = await database.getUser(usernameActionPerformedBy);

    if (!await Userrole.canUserroleEditUserrole(user.userrole.name, userrole, database)) {
      throw new AuthenticationError(user.userrole.name, `Userrole ${user.userrole.name} can not delete userrole ${userrole}`);
    }

    return database.deleteUserrole(userrole);
  },
};
