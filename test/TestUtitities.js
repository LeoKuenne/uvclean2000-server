const jwt = require('jsonwebtoken');
const fernet = require('fernet');
const fs = require('fs');
const User = require('../server/dataModels/User');
const Userrole = require('../server/dataModels/Userrole');

module.exports = {
  createUserUserroleAdmin: async (database) => {
    const allRights = Userrole.getUserroleRights();
    const rightsObject = {};
    allRights.forEach((right) => {
      rightsObject[right.propertie] = true;
    });

    const userrole = new Userrole('Admin', rightsObject);
    await database.addUserrole(userrole);
    await database.addUser(new User('Admin', 'AdminPassword', 'Admin'));
  },
  createUserUserroleGuest: async (database) => {
    const allRights = Userrole.getUserroleRights();
    const rightsObject = {};
    allRights.forEach((right) => {
      rightsObject[right.propertie] = false;
    });

    const userrole = new Userrole('Guest', rightsObject);
    await database.addUserrole(userrole);
    await database.addUser(new User('Guest', 'AdminPassword', 'Guest'));
  },
  createUserroleGuest: async (database) => {
    const allRights = Userrole.getUserroleRights();
    const rightsObject = {};
    allRights.forEach((right) => {
      rightsObject[right.propertie] = false;
    });

    const userrole = new Userrole('Guest', rightsObject);
    await database.addUserrole(userrole);
  },
  createUserroleAdmin: async (database) => {
    const allRights = Userrole.getUserroleRights();
    const rightsObject = {};
    allRights.forEach((right) => {
      rightsObject[right.propertie] = true;
    });

    const userrole = new Userrole('Admin', rightsObject);
    await database.addUserrole(userrole);
  },
  createJWTToken: (username) => jwt.sign({
    username,
    userId: '123',
  }, 'SECRETKEY', {
    expiresIn: '1d',
  }),
  decodeFernetToken(text, secretPath) {
    const secret = fernet.setSecret(fs.readFileSync(secretPath, { encoding: 'base64' }));
    const token = new fernet.Token({
      secret,
      token: text,
      ttl: 1,
    });
    const decoded = token.decode();
    if (decoded === text) throw new Error(`Could not decode ${text}`);
    return decoded;
  },
  async encodeFernetToken(text, secretPath) {
    const secret = fernet.setSecret(fs.readFileSync(secretPath, { encoding: 'base64' }));
    const token = new fernet.Token({
      secret,
    });
    const encoded = await token.encode(text);
    return encoded;
  },
};
