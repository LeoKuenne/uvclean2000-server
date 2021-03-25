const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const User = require('../../dataModels/User');
const MainLogger = require('../../Logger.js').logger;
const Userrole = require('../../dataModels/Userrole');

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
  async execute(userrolename, rightsObject, canEditUserrole) {
    logger.info('Executing CreateUserroleCommand with userrolename: %s, rights: %o, canEditUserrole: %o', userrolename, rightsObject, canEditUserrole);

    const userrole = new Userrole(userrolename, rightsObject, canEditUserrole);

    await database.addUserrole(userrole);
    return database.getUserrole(userrole.name);
  },
};
