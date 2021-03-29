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
  async execute(usernameActionPerformedBy, username) {
    logger.info('Executing DeleteUserCommand with username: %s', username);

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);
    const dbUserActionPerfomedTo = await database.getUser(username);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditUser.allowed
      || !await Userrole.canUserroleEditUserrole(dbUserActionPerfomedBy.userrole.name, dbUserActionPerfomedTo.userrole.name, database)) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not delete user ${username}`);
    }

    return database.deleteUser(username);
  },
};
