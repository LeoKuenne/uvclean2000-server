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
  async execute(userrolename, rightsObject) {
    logger.info('Executing CreateUserroleCommand with userrolename: %s, rights: %o', userrolename, rightsObject);

    const userrole = new Userrole(userrolename, rightsObject);

    await database.addUserrole(userrole);
    return database.getUserrole(userrole.name);
  },
};
