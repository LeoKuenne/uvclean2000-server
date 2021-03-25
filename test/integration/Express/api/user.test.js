global.config = {
  http: { secure: false },
};

/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
const bcrypt = require('bcrypt');
const supertest = require('supertest');
const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');
const ExpressServer = require('../../../../server/ExpressServer/ExpressServer');
const MongoDBAdapter = require('../../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const User = require('../../../../server/dataModels/User');
const Userrole = require('../../../../server/dataModels/Userrole');
const CreateUserCommand = require('../../../../server/commands/UserCommand/CreateUserCommand');
const ChangeUserPasswordCommand = require('../../../../server/commands/UserCommand/ChangeUserPasswordCommand');
const ChangeUserroleCommand = require('../../../../server/commands/UserCommand/ChangeUserroleOfUserCommand');
const CreateUserroleCommand = require('../../../../server/commands/UserCommand/CreateUserroleCommand');
const DeleteUserroleCommand = require('../../../../server/commands/UserCommand/DeleteUserroleCommand');
const UpdateUserroleNameCommand = require('../../../../server/commands/UserCommand/UpdateUserroleNameCommand');
const UpdateUserroleRightsCommand = require('../../../../server/commands/UserCommand/UpdateUserroleRightsCommand');

let request = null;

let expressServer = null;
let database = null;
let server = null;

const token = jwt.sign({
  username: 'Test',
  userId: '123',
}, 'SECRETKEY', {
  expiresIn: '1d',
});

beforeAll(async () => {
  server = new EventEmitter();
  server.on('error', (e) => { });
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
  expressServer = new ExpressServer(
    server,
    database,
  );
  expressServer.startExpressServer();
  request = supertest(expressServer.app);

  CreateUserCommand.register(database);
  ChangeUserPasswordCommand.register(database);
  ChangeUserroleCommand.register(database);
  CreateUserroleCommand.register(database);
  DeleteUserroleCommand.register(database);
  UpdateUserroleNameCommand.register(database);
  UpdateUserroleRightsCommand.register(database);
});

afterAll(async () => {
  await database.close();
  expressServer.stopExpressServer();
});

describe('Express Route testing', () => {
  describe('GET /api/user', () => {
    afterEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
    });

    it('GET /api/user returns the requested user', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      await database.addUserrole(userrole);
      const user = await database.addUser(new User('admin', 'TestPassword', 'Admin'));

      const res = await request.get('/api/user')
        .query({ username: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          id: user._id.toString(),
          username: user.username,
          userrole: {
            rules: userrole.rules,
            canEditUserrole: userrole.canEditUserrole,
            name: userrole.name,
          },
        },
      });
    });

    it('GET /api/user returns 401 if no username is queried', async () => {
      const res = await request.get('/api/user')
        .query({});

      expect(res.status).toBe(401);
      expect(res.body.msg).toMatch('Username has to be defined and type of string');
    });

    it('GET /api/users return all users', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      await database.addUserrole(userrole);

      const users = [];

      for (let i = 0; i < 10; i += 1) {
        users.push(new User(`admin${i}`, 'TestPassword', 'Admin'));
      }

      await Promise.all(users.map(async (user) => {
        await database.addUser(user);
      }));

      const res = await request.get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(10);

      for (let i = 0; i < 10; i += 1) {
        expect(res.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              username: users[i].username,
              userrole: {
                name: userrole.name,
                rules: userrole.rules,
                canEditUserrole: userrole.canEditUserrole,
              },
            }),
          ]),
        );
      }
    });
  });

  describe('POST /api/updateUser', () => {
    beforeAll(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Admin', rightsObject));
      await database.addUserrole(new Userrole('Guest', rightsObject));
      await database.addUser(new User('TestUsername', 'UsernamePassword', 'Admin'));
    });

    afterAll(async () => {
      await database.clearCollection('userroles');
      await database.clearCollection('users');
    });

    it('action changePassword changes the user password and returns the new user', async () => {
      await database.getUser('TestUsername');
      await database.getUserrole('Admin');
      const res = await request.post('/api/updateUser?user=Test&action=changePassword')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "oldPassword":"UsernamePassword", "newPassword":"NewPassword", "newPasswordRepeated":"NewPassword"}');

      expect(res.status).toBe(201);
      expect(bcrypt.compareSync('NewPassword', res.body.password)).toBe(true);
      expect(res.body.username).toMatch('TestUsername');
    });

    it('action changePassword returns 401 if the repeated password does not match', async () => {
      const res = await request.post('/api/updateUser?user=Test&action=changePassword')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "oldPassword":"UsernamePassword", "newPassword":"NewPassword", "newPasswordRepeated":"password"}');

      expect(res.status).toBe(401);
      expect(res.body.msg).toMatch('The new password does not match with the repeated password');
    });

    it('action changePassword returns 401 if the old password does not match', async () => {
      const res = await request.post('/api/updateUser?user=Test&action=changePassword')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "oldPassword":"password", "newPassword":"NewPassword", "newPasswordRepeated":"NewPassword"}');

      expect(res.status).toBe(401);
      expect(res.body.msg).toMatch('The old password does not match');
    });

    it('action changePassword returns 401 if the new password does not match the rules', async () => {
      const res = await request.post('/api/updateUser?user=Test&action=changePassword')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "oldPassword":"password", "newPassword":"NewPassword++ß123_.", "newPasswordRepeated":"NewPassword++ß123_."}');

      expect(res.status).toBe(401);
      expect(res.body.msg).toMatch('Password has to be vaild. Password length has to be at least 5. '
        + `Only letters and numbers are allowed.\n Invalid characters: ${('NewPassword++ß123_.').match(/[^0-9A-Za-z+#-.!&]/gm).join(',')}`);
    });

    it('action changeUserrole changes the userrole and returns the new user', async () => {
      const res = await request.post('/api/updateUser?user=Test&action=changeUserrole')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "newUserrole":"Guest"}');

      await database.getUser('TestUsername');
      const userrole = await database.getUserrole('Guest');

      expect(res.status).toBe(201);
      expect(res.body.username).toMatch('TestUsername');
      expect(res.body.userrole).toEqual(userrole);
    });

    it('action changeUserrole returns 401 if the new userrole does not exists', async () => {
      const res = await request.post('/api/updateUser?user=Test&action=changeUserrole')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "newUserrole":"Test"}');

      const user = await database.getUser('TestUsername');

      expect(res.status).toBe(401);
      expect(res.body.msg).toMatch('Userrole does not exists');
    });

    it('action changeUserrole returns 401 if the username is not provided', async () => {
      const res = await request.post('/api/updateUser?user=Test&action=changeUserrole')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"newUserrole":"Test"}');

      expect(res.status).toBe(401);
      expect(res.body.msg).toMatch('Username has to be defined and of type string');
    });
  });

  describe('POST /api/addUser routes', () => {
    afterEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
    });

    it('POST /api/addUser return the user and responses with status 201', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });
      await database.addUserrole(new Userrole('Admin', rightsObject));

      const res = await request.post('/api/addUser?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      expect(res.status).toBe(201);

      const user = await database.getUser('TestUsername');
      expect(res.body.username).toEqual(user.username);
      expect(res.body.userrole.name).toEqual(user.userrole.name);

      done();
    });

    it('POST /api/addUser route creates user in database', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });
      await database.addUserrole(new Userrole('Admin', rightsObject));

      const res = await request.post('/api/addUser?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      expect(res.status).toBe(201);
      const user = await database.getUser('TestUsername');
      expect(user.username).toMatch('TestUsername');
      expect(user.userrole.name).toMatch('Admin');
      done();
    });

    it('POST /api/addUser responses with 401 when user already exists', async (done) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });
      await database.addUserrole(new Userrole('Admin', rightsObject));
      await database.addUser(new User('TestUsername', 'UsernamePassword', 'Admin'));

      const res = await request.post('/api/addUser?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      expect(res.body.msg).toMatch('User already exists');
      expect(res.status).toBe(401);

      done();
    });
  });
});
