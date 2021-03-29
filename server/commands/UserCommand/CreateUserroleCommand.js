const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const AuthenticationError = require('../../errors/AuthenticationError');
const Userrole = require('../../dataModels/Userrole');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'CreateUserroleCommand' });

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(usernameActionPerformedBy, userrolename, rightsObject, canBeEditedByUserrole) {
    logger.info('Executing CreateUserroleCommand with userrolename: %s, rights: %o, canBeEditedByUserrole: %o', userrolename, rightsObject, canBeEditedByUserrole);

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditUserrole.allowed) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not create userrole ${userrolename}`);
    }

    const userrole = new Userrole(userrolename, rightsObject, canBeEditedByUserrole);

    await database.addUserrole(userrole);
    return database.getUserrole(userrole.name);
  },
};
