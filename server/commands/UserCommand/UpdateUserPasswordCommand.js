const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const AuthenticationError = require('../../errors/AuthenticationError');
const Userrole = require('../../dataModels/Userrole');
const User = require('../../dataModels/User');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UpdateUserPasswordCommand' });

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(usernameActionPerformedBy, username, oldPassword, newPassword, newPasswordRepeated) {
    logger.info('Executing UpdateUserPasswordCommand with username: %s, oldPassword: %s, newPassword: %s, newPasswordRepeated: %s', username, oldPassword, newPassword, newPasswordRepeated);

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);
    const dbUserActionPerfomedTo = await database.getUser(username);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditUser.allowed
      || !await Userrole.canUserroleEditUserrole(dbUserActionPerfomedBy.userrole.name, dbUserActionPerfomedTo.userrole.name, database)) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not change password of user ${username}`);
    }

    if (newPassword !== newPasswordRepeated) throw new Error('The new password does not match with the repeated password');

    User.verifyPassword(newPassword);

    return database.changeUserPassword(username, oldPassword, newPassword);
  },
};
