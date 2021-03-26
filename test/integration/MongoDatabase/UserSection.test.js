/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
const bcrypt = require('bcrypt');
const UserModel = require('../../../server/databaseAdapters/mongoDB/models/user.js');
const UserroleModel = require('../../../server/databaseAdapters/mongoDB/models/userrole.js');
const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const User = require('../../../server/dataModels/User.js');
const Userrole = require('../../../server/dataModels/Userrole.js');

let database;

describe('MongoDBAdapter User Functions', () => {
  beforeAll(async () => {
    database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  describe('Userrole functions', () => {
    beforeEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
    });

    it('AddUserrole adds an userrole to the database', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      const newUserrole = await database.addUserrole(userrole);
      const docUserrole = await UserroleModel.findOne({ name: userrole.name }).lean();
      expect(docUserrole._id).toEqual(newUserrole._id);
      expect(docUserrole.userrolename).toEqual(newUserrole.userrolename);
      expect(docUserrole.canBeEditedByUserrole).toStrictEqual([]);

      allRights.forEach((right) => {
        expect(docUserrole[right.propertie]).toEqual(newUserrole[right.propertie]);
      });
    });

    it('AddUserrole throws an error if userrole already exists', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Admin', rightsObject));

      try {
        await database.addUserrole(new Userrole('Admin', rightsObject));
        done(new Error('add Userrole did not throw'));
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Userrole already exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('AddUserrole adds an userrole to the database and adds userrole ids to canBeEditedByUserrole', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Test1', rightsObject));
      await database.addUserrole(new Userrole('Test2', rightsObject));
      await database.addUserrole(new Userrole('Admin', rightsObject, ['Test1', 'Test2']));

      const docUserrole = await database.getUserrole('Admin');
      const docUserrole1 = await database.getUserrole('Test1');
      const docUserrole2 = await database.getUserrole('Test2');

      expect(docUserrole.canBeEditedByUserrole).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: docUserrole1.name,
          }),
        ]),
      );

      expect(docUserrole.canBeEditedByUserrole).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: docUserrole2.name,
          }),
        ]),
      );
      done();
    });

    it('AddUserrole throws an error if an userrole is passed to canBeEditedByUserrole that not exists', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      try {
        await database.addUserrole(new Userrole('Admin', rightsObject, ['Test1', 'Test2']));
        done(new Error('addUserrole did not throw'));
      } catch (error) {
        expect(error.message).toMatch('Userrole Test1 does not exists');
      }

      try {
        await database.getUserrole('Admin');
        done(new Error('User was added but it should not'));
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Userrole does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('updateUserrole updates an userroles name and rights in the database', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject1 = {};
      const rightsObject2 = {};
      allRights.forEach((right) => {
        rightsObject1[right.propertie] = true;
        rightsObject2[right.propertie] = false;
      });

      const userrole1 = new Userrole('Admin', rightsObject1);
      await database.addUserrole(userrole1);
      const userrole2 = new Userrole('Guest', rightsObject2);
      await database.updateUserrole('Admin', userrole2);
      const newUserrole = await database.getUserrole('Guest');

      expect(newUserrole.name).toMatch('Guest');
      allRights.forEach((right) => {
        expect(userrole2.rules[right.propertie].allowed)
          .toEqual(newUserrole.rules[right.propertie].allowed);
      });
    });

    it('updateUserrole updates an userrole canBeEditedByUserrole in the database', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject1 = {};
      allRights.forEach((right) => {
        rightsObject1[right.propertie] = true;
      });

      const userrole1 = new Userrole('Admin', rightsObject1);
      const userrole2 = new Userrole('Test1', rightsObject1);
      const userrole3 = new Userrole('Test2', rightsObject1);
      await database.addUserrole(userrole1);
      await database.addUserrole(userrole2);
      await database.addUserrole(userrole3);

      await database.updateUserrole('Admin', new Userrole('Admin', rightsObject1, ['Test1']));
      const newUserrole = await database.getUserrole('Admin');

      expect(newUserrole.name).toMatch('Admin');

      expect(newUserrole.canBeEditedByUserrole).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: userrole2.name,
          }),
        ]),
      );

      expect(newUserrole.canBeEditedByUserrole).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            name: userrole3.name,
          }),
        ]),
      );
    });

    it('updateUserrole throws an error if userrole does not exists', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject1 = {};
      allRights.forEach((right) => {
        rightsObject1[right.propertie] = true;
      });

      const userrole1 = new Userrole('Admin', rightsObject1);
      try {
        await database.updateUserrole('Admin', userrole1);
        throw new Error('updateUserrole did not throw');
      } catch (error) {
        try {
          expect(error.message).toMatch('Userrole does not exists');
          done();
        } catch (e) { done(e); }
      }
    });

    it('updateUserrole throws an error if userrolename is not a string', async (done) => {
      try {
        await database.updateUserrole(false);
        throw new Error('updateUserrole did not throw');
      } catch (error) {
        try {
          expect(error.message).toMatch('Name has to be defined and type of string');
          done();
        } catch (e) { done(e); }
      }
    });

    it('updateUserrole throws an error if userrole is not an instance of class userrole', async (done) => {
      try {
        await database.updateUserrole('false');
        throw new Error('updateUserrole did not throw');
      } catch (error) {
        try {
          expect(error.message).toMatch('Userrole has to be defined and an instance of the class User');
          done();
        } catch (e) { done(e); }
      }
    });

    it('DeleteUserrole throws an error if the userrole is assigned to a user', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      const newUserrole = await database.addUserrole(userrole);

      await database.addUser(new User('Test User', 'TestPassword', 'Admin'));

      try {
        await database.deleteUserrole(newUserrole.name);
        done(new Error('deleteUserrole did not throw'));
      } catch (error) {
        expect(error.message).toMatch('Userrole is still assigned to a user. Please remove the assignment');
        done();
      }
    });

    it('DeleteUserrole deletes userrole from database', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);

      const newUserrole = await database.addUserrole(userrole);

      const docUserrole = await database.deleteUserrole(newUserrole.name);

      expect(docUserrole._id).toEqual(newUserrole._id);
      expect(docUserrole.name).toEqual(newUserrole.name);
      expect(userrole.canBeEditedByUserrole).toEqual(docUserrole.canBeEditedByUserrole);

      allRights.forEach((right) => {
        expect(userrole.rules[right.propertie].allowed).toEqual(docUserrole[right.propertie]);
      });

      try {
        await database.getUserrole(docUserrole.name);
        done(new Error('getUserrole did not throw'));
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Userrole does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('DeleteUserrole deletes userrole from other canBeEditedByUserrole dependencies', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Test1', rightsObject));
      await database.addUserrole(new Userrole('Admin', rightsObject, ['Test1']));

      await database.getUserrole('Admin');
      await database.getUserrole('Test1');

      await database.deleteUserrole('Test1');

      const userrole = await database.getUserrole('Admin');

      const dbUserrole = await UserroleModel.findOne({
        name: 'Admin',
      }).lean().exec();

      expect(userrole.canBeEditedByUserrole).toEqual([]);
      expect(dbUserrole.canBeEditedByUserrole).toEqual([]);
      done();
    });

    it('GetUserrole gets userrole from database', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      await database.addUserrole(userrole);

      const newUserrole = await database.getUserrole('Admin');

      expect(userrole.name).toEqual(newUserrole.name);
      expect(userrole.canBeEditedByUserrole).toEqual(newUserrole.canBeEditedByUserrole);

      allRights.forEach((right) => {
        expect(userrole.rules[right.propertie].allowed)
          .toEqual(newUserrole.rules[right.propertie].allowed);
      });

      expect(userrole.canBeEditedByUserrole).toEqual([]);
    });

    it('GetUserrole throws error if userrolename is not defined', async (done) => {
      try {
        await database.getUserrole();
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Userrolename has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUserrole throws error if username is not a string', async (done) => {
      try {
        await database.getUserrole(false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Userrolename has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUserrole throws error if userrole does not exists', async (done) => {
      try {
        await database.getUserrole('Admin');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Userrole does not exists');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('userroles gets all userroles from database', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userroles = [];

      for (let i = 0; i < 10; i += 1) {
        userroles.push(new Userrole(`Test Userrole ${i}`, rightsObject));
      }

      await Promise.all(userroles.map(async (userrole) => {
        await database.addUserrole(userrole);
      }));

      const dbUserroles = await database.getUserroles();
      expect(dbUserroles.length).toBe(userroles.length);

      for (let i = 0; i < dbUserroles.length; i += 1) {
        const userrole = dbUserroles[i];

        expect(dbUserroles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: userrole.name,
              canBeEditedByUserrole: [],
            }),
          ]),
        );

        allRights.forEach((right) => {
          expect(userroles[i].rules[right.propertie].allowed)
            .toEqual(userrole.rules[right.propertie].allowed);
        });
      }
    });

    it('userroles returns empty array if no userroles exists', async () => {
      const dbUserroles = await database.getUserroles();
      expect(dbUserroles.length).toBe(0);
    });
  });

  describe('User functions', () => {
    beforeEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
    });

    it('AddUser adds user to database', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      const newUserrole = await database.addUserrole(userrole);

      const user = new User('Test User', 'TestPassword', 'Admin');
      const newUser = await database.addUser(user);
      const docUser = await UserModel.findOne({ username: user.username });
      expect(docUser._id).toEqual(newUser._id);
      expect(docUser.username).toEqual(newUser.username);
      expect(docUser.userrole).toEqual(newUserrole._id);
    });

    it('Throws an error if the user already exists', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Admin', rightsObject));
      await database.addUser(new User('TestUser', 'TestPassword', 'Admin'));
      try {
        await database.addUser(new User('TestUser', 'TestPassword', 'Admin'));
      } catch (e) {
        try {
          expect(e.toString()).toMatch('User already exists');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('Throws an error if the argument is not an instance of the class user', async (done) => {
      try {
        await database.addUser({ username: 'Test' });
      } catch (e) {
        try {
          expect(e.toString()).toMatch('User has to be defined and an instance of the class User');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('DeleteUser deletes user from database', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      const newUserrole = await database.addUserrole(userrole);
      const user = new User('Test User', 'TestPassword', 'Admin');

      const newUser = await database.addUser(user);
      const dbUser = await database.deleteUser(newUser.username);
      expect(dbUser._id.toString()).toMatch(newUser._id.toString());
      expect(dbUser.username).toEqual(newUser.username);
      expect(dbUser.password).toEqual(newUser.password);
      try {
        await database.getUser(newUser.username);
      } catch (err) {
        try {
          expect(err.toString()).toMatch('User does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('DeleteUser throws error if username is not a string', async (done) => {
      try {
        await database.deleteUser();
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Username has to be defined and of type string');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('UpdateUserrole updates userrole of user', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Admin', rightsObject));
      const guestUserrole = await database.addUserrole(new Userrole('Guest', rightsObject));

      const user = new User('Test User', 'TestPassword', 'Admin');
      const newUser = await database.addUser(user);

      const dbUser = await database.updateUserroleOfUser('Test User', 'Guest');

      expect(dbUser.id.toString()).toMatch(newUser._id.toString());
      expect(dbUser.userrole.name).toMatch(guestUserrole.name);
    });

    it('UpdateUserrole throws error if username is not a string', async (done) => {
      try {
        await database.updateUserroleOfUser(true);
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Username has to be defined and of type string');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('UpdateUserrole throws error if userrole is not a string', async (done) => {
      try {
        await database.updateUserroleOfUser('Test User', true);
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Userrole has to be defined and of type string');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('UpdateUserrole throws error if user does not exists', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Admin', rightsObject));
      try {
        await database.updateUserroleOfUser('User', 'Admin');
      } catch (err) {
        try {
          expect(err.toString()).toMatch('User does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('UpdateUserrole throws error if userrole does not exists', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Admin', rightsObject));
      await database.addUser(new User('Test User', 'TestPassword', 'Admin'));

      try {
        await database.updateUserroleOfUser('Test User', 'Userrole');
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Userrole does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('ChangeUserPassword changes the password of the user', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Admin', rightsObject));
      const user = new User('Test User', 'TestPassword', 'Admin');
      await database.addUser(user);

      const dbUser = await database.changeUserPassword(
        user.username,
        user.password,
        'NewTest',
      );
      expect(dbUser.username).toEqual(user.username);
      expect(bcrypt.compareSync('NewTest', dbUser.password)).toBe(true);
    });

    it('ChangeUserPassword throws error if the old password does not match with the existing one', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const user = new User('Test User', 'TestPassword', 'Admin');
      await database.addUserrole(new Userrole('Admin', rightsObject));
      await database.addUser(user);

      await database.changeUserPassword(
        user.username,
        user.password,
        'NewTest',
      );

      try {
        await database.changeUserPassword(user.username, 'Test Falsch', 'NewTest');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('The old password does not match');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the user does not exists', async (done) => {
      try {
        await database.changeUserPassword('admin', 'Test Falsch', 'NewTest');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('User does not exists');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the username is not defined', async (done) => {
      try {
        await database.changeUserPassword();
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Username has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the username is not type of string', async (done) => {
      try {
        await database.changeUserPassword(false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Username has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the oldPassword is not defined', async (done) => {
      try {
        await database.changeUserPassword('Test');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Old password has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the oldPassword is not type of string', async (done) => {
      try {
        await database.changeUserPassword('Test', false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Old password has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the newPassword is not defined', async (done) => {
      try {
        await database.changeUserPassword('Test', 'Test');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('New password has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the newPassword is not type of string', async (done) => {
      try {
        await database.changeUserPassword('Test', 'Test', false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('New password has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUser gets user from database', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const dbUserrole = await database.addUserrole(new Userrole('Admin', rightsObject));
      const dbUser = await database.addUser(new User('Test User', 'TestPassword', 'Admin'));
      const newUser = await database.getUser(dbUser.username);

      expect(dbUser.username).toEqual(newUser.username);
      expect(newUser.userrole.canBeEditedByUserrole).toEqual(dbUserrole.canBeEditedByUserrole.toObject());

      allRights.forEach((right) => {
        expect(newUser.userrole.rules[right.propertie].allowed)
          .toEqual(dbUserrole[right.propertie]);
      });
    });

    it('GetUser throws error if username is not defined', async (done) => {
      try {
        await database.getUser();
      } catch (e) {
        try {
          expect(e.toString()).toMatch('username has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUser throws error if username is not a string', async (done) => {
      try {
        await database.getUser(false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('username has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUser throws error if user does not exists', async (done) => {
      try {
        await database.getUser('602e5dde6a51ff41b0625057');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('User does not exists');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUsers gets all users from database', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = await database.addUserrole(new Userrole('Admin', rightsObject));
      const users = [];

      for (let i = 0; i < 10; i += 1) {
        users.push(new User(`Test User ${1}`, `TestPassword${i}`, 'Admin'));
      }
      await Promise.all(users.map(async (user) => {
        await database.addUser(user);
      }));

      const dbUsers = await database.getUsers();
      expect(dbUsers.length).toBe(users.length);
      for (let i = 0; i < dbUsers.length; i += 1) {
        const user = dbUsers[i];

        expect(user.username).toEqual(users[i].username);
        expect(user.userrole.canBeEditedByUserrole).toEqual(userrole.canBeEditedByUserrole.toObject());
        expect(user.userrole.name).toEqual(userrole.name);

        allRights.forEach((right) => {
          expect(user.userrole.rules[right.propertie].allowed)
            .toEqual(userrole[right.propertie]);
        });
      }
    });

    it('GetUsers returns empty array if no users exists', async () => {
      const dbUsers = await database.getUsers();
      expect(dbUsers.length).toBe(0);
    });
  });
});
