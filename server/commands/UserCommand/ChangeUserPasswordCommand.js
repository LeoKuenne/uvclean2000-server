const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const User = require('../../dataModels/User');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'ChangeUserPasswordCommand' });

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(username, oldPassword, newPassword, newPasswordRepeated) {
    logger.info('Executing ChangeUserPasswordCommand with username: %s, oldPassword: %s, newPassword: %s, newPasswordRepeated: %s', username, oldPassword, newPassword, newPasswordRepeated);
    if (newPassword !== newPasswordRepeated) throw new Error('The new password does not match with the repeated password');

    User.verifyPassword(newPassword);

    return database.changeUserPassword(username, oldPassword, newPassword);
  },
};
