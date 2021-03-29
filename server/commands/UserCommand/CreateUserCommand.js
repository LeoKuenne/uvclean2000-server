const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const User = require('../../dataModels/User');
const Userrole = require('../../dataModels/Userrole');
const AuthenticationError = require('../../errors/AuthenticationError');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'CreateUserCommand' });

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(usernameActionPerformedBy, username, password, userrole) {
    logger.info('Executing CreateUserCommand with username: %s, password: %s, userrole: %s', username, password, userrole);
    const user = new User(username, password, userrole);

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditUser.allowed) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not create user ${username}`);
    }

    await database.addUser(user);
    return database.getUser(user.username);
  },
};
