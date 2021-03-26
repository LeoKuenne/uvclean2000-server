const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
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
  async execute(userrolename, rightObject, canBeEditedByUserrole) {
    logger.info('Executing UpdateUserroleRightsCommand with name: %s, rightsobject: %o, canBeEditedByUserrole: %o', userrolename, rightObject, canBeEditedByUserrole);

    await database.updateUserrole(userrolename, new Userrole(userrolename, rightObject,
      canBeEditedByUserrole));

    return database.getUserrole(userrolename);
  },
};
