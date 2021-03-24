const MongoDBAdapter = require('../../databaseAdapters/mongoDB/MongoDBAdapter');
const User = require('../../dataModels/User');

let database = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   */
  register(db) {
    database = db;
  },
  async execute(username, password, userrole) {
    const user = new User(username, password, userrole);

    await database.addUser(user);
    return database.getUser(user.username);
  },
};
