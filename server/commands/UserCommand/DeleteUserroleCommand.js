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
  async execute(usernameActionPerformedBy, userrolename) {
    logger.info('Executing DeleteUserroleCommand with userrolename: %s', userrolename);

    const user = await database.getUser(usernameActionPerformedBy);

    if (!await Userrole.canUserroleEditUserrole(user.userrole.name, userrolename, database)) {
      throw new AuthenticationError(user.userrole.name, `Userrole ${user.userrole.name} can not delete userrole ${userrolename}`);
    }

    return database.deleteUserrole(userrolename);
  },
};
