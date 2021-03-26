const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const AuthenticationError = require('../../errors/AuthenticationError');
const Userrole = require('../../dataModels/Userrole');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UpdateUserroleRightsCommand' });

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(usernameActionPerformedBy, userrolename, rightObject, canBeEditedByUserrole) {
    logger.info('Executing UpdateUserroleRightsCommand with name: %s, rightsobject: %o, canBeEditedByUserrole: %o', userrolename, rightObject, canBeEditedByUserrole);

    const user = await database.getUser(usernameActionPerformedBy);

    if (!await Userrole.canUserroleEditUserrole(user.userrole.name, userrolename, database)) {
      throw new AuthenticationError(user.userrole.name, `Userrole ${user.userrole.name} can not change userrole ${userrolename}`);
    }

    await database.updateUserrole(userrolename, new Userrole(userrolename, rightObject,
      canBeEditedByUserrole));

    return database.getUserrole(userrolename);
  },
};
