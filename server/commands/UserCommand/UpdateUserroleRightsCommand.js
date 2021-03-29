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

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditUser.allowed
      || !await Userrole.canUserroleEditUserrole(dbUserActionPerfomedBy.userrole.name, userrolename, database)) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not change userrole ${userrolename}`);
    }

    await database.updateUserrole(userrolename, new Userrole(userrolename, rightObject,
      canBeEditedByUserrole));

    return database.getUserrole(userrolename);
  },
};
