global.config = {
  http: { secure: false },
};

/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
const supertest = require('supertest');
const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');
const ExpressServer = require('../../../../server/ExpressServer/ExpressServer');
const MongoDBAdapter = require('../../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const Userrole = require('../../../../server/dataModels/Userrole');
const CreateUserCommand = require('../../../../server/commands/UserCommand/CreateUserCommand');
const ChangeUserPasswordCommand = require('../../../../server/commands/UserCommand/ChangeUserPasswordCommand');
const ChangeUserroleCommand = require('../../../../server/commands/UserCommand/ChangeUserroleOfUserCommand');
const CreateUserroleCommand = require('../../../../server/commands/UserCommand/CreateUserroleCommand');
const DeleteUserroleCommand = require('../../../../server/commands/UserCommand/DeleteUserroleCommand');
const UpdateUserroleNameCommand = require('../../../../server/commands/UserCommand/UpdateUserroleNameCommand');
const UpdateUserroleRightsCommand = require('../../../../server/commands/UserCommand/UpdateUserroleRightsCommand');
const TestUtitities = require('../../../TestUtitities');

let request = null;

let expressServer = null;
let database = null;
let server = null;

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

describe('Userrole api routes', () => {
  describe('POST /api/deleteUserrole', () => {
    beforeEach(async () => {
      await database.clearCollection('userroles');
      await database.clearCollection('users');

      await TestUtitities.createUserUserroleAdmin(database);
    });

    it('Returns 403 if the user has not the userrights', async () => {
      await TestUtitities.createUserUserroleGuest(database);

      const res = await request.post('/api/deleteUserrole?user=Guest')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Guest')}`])
        .send('{"userrole":"Guest"}');

      expect(res.status).toBe(403);
      expect(res.text).toMatch('You do not have the userrights for that action');
    });

    it('Deletes an other userrole and returns it', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = false;
      });

      const userrole = new Userrole('Guest', rightsObject, ['Admin']);
      await database.addUserrole(userrole);

      const res = await request.post('/api/deleteUserrole?user=Admin')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send('{"userrolename":"Guest"}');

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('Guest');
      Userrole.getUserroleRights().forEach((right) => {
        expect(res.body[right.propertie]).toBe(false);
      });
    });

    it('returns 401 if no userrolename is passed', async () => {
      const res = await request.post('/api/deleteUserrole?user=Admin')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send('{}');

      expect(res.status).toBe(401);
      expect(res.body.msg).toMatch('Userrolename has to be defined and of type string');
    });
  });

  describe('POST /api/createUserrole', () => {
    beforeEach(async () => {
      await database.clearCollection('userroles');
      await database.clearCollection('users');

      await TestUtitities.createUserUserroleAdmin(database);
    });

    it('Returns 403 if the user has not the userrights', async () => {
      await TestUtitities.createUserUserroleGuest(database);

      const res = await request.post('/api/createUserrole?user=Guest')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Guest')}`])
        .send('{"userrole":"Guest"}');

      expect(res.status).toBe(403);
      expect(res.text).toMatch('You do not have the userrights for that action');
    });

    it('Creates an userrole and returns it', async () => {
      const allRights = Userrole.getUserroleRights();

      let createString = '';
      allRights.forEach((right) => {
        createString += `"${right.propertie}":"true",`;
      });

      const res = await request.post('/api/createUserrole?user=Admin')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(`{"userrole":"Guest", ${createString.substring(0, createString.length - 1)}}`);

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('Guest');
      allRights.forEach((right) => {
        expect(res.body.rules[right.propertie].allowed).toBe(true);
        expect(res.body.rules[right.propertie].desciption).toBe(right.desciption);
      });
    });

    it('Creates an userrole with canBeEditedByUserroles and returns it', async () => {
      const allRights = Userrole.getUserroleRights();

      const rightsObject = {};
      let createString = '';
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
        createString += `"${right.propertie}":"true",`;
      });

      database.addUserrole(new Userrole('Test1', rightsObject));

      const res = await request.post('/api/createUserrole?user=Admin')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(`{"userrole":"Guest", ${createString.substring(0, createString.length - 1)},"canBeEditedByUserrole":["Test1"]}`);

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('Guest');
      allRights.forEach((right) => {
        expect(res.body.rules[right.propertie].allowed).toBe(true);
        expect(res.body.rules[right.propertie].desciption).toBe(right.desciption);
      });

      expect(res.body.canBeEditedByUserrole).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Test1',
          }),
        ]),
      );
    });

    it('returns 401 if no userrolename is passed', async (done) => {
      const allRights = Userrole.getUserroleRights();
      if (allRights.length === 0) throw new Error('Route can not return 401 because there is no rule to set');

      const res = await request.post('/api/createUserrole?user=Admin')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send('{}');

      try {
        expect(res.status).toBe(401);
        expect(res.body.msg).toMatch('Name for the Userrole must be defined and of type string');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  describe('POST /api/updateUserrole', () => {
    beforeEach(async () => {
      await database.clearCollection('userroles');
      await database.clearCollection('users');

      await TestUtitities.createUserUserroleAdmin(database);
    });

    afterAll(async () => {
      await database.clearCollection('userroles');
      await database.clearCollection('users');
    });

    it('returns 403 if the user has not the userrights', async () => {
      await TestUtitities.createUserUserroleGuest(database);

      const res = await request.post('/api/updateUserrole?action=changeName')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Guest')}`])
        .send('{"oldUsername":"Admin", "newUsername":"TestUser"}');
      expect(res.status).toBe(403);
      expect(res.text).toMatch('You do not have the userrights for that action');
    });

    it('returns 403 if the user can not edit that userrole with action changeName', async () => {
      await TestUtitities.createUserUserroleGuest(database);

      const res = await request.post('/api/updateUserrole?action=changeName')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send('{"oldUsername":"Guest", "newUsername":"TestUser"}');

      expect(res.status).toBe(403);
      expect(res.text).toMatch('Userrole Admin can not change userrole Guest');
    });

    it('returns 403 if the user can not edit that userrole with action changeRights', async () => {
      const allRights = Userrole.getUserroleRights();

      let createString = '';
      allRights.forEach((right) => {
        createString += `"${right.propertie}":"false",`;
      });
      await TestUtitities.createUserUserroleGuest(database);

      const res = await request.post('/api/updateUserrole?action=changeRights')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(`{"userrole":"Guest",${createString.substring(0, createString.length - 1)}}`);

      expect(res.status).toBe(403);
      expect(res.text).toMatch('Userrole Admin can not change userrole Guest');
    });

    it('Updates the userrole with new Name if action is changeName and returns it', async () => {
      const res = await request.post('/api/updateUserrole?action=changeName')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send('{"oldUsername":"Admin", "newUsername":"TestUser"}');

      const newUserrole = await database.getUserrole('TestUser');

      expect(newUserrole.name).toMatch('TestUser');

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('TestUser');
      Userrole.getUserroleRights().forEach((right) => {
        expect(res.body[right.propertie]).toBe(true);
      });
    });

    it('Updates the userrole with action changeRights and returns it', async () => {
      const allRights = Userrole.getUserroleRights();

      let createString = '';
      allRights.forEach((right) => {
        createString += `"${right.propertie}":"false",`;
      });

      const res = await request.post('/api/updateUserrole?action=changeRights')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(`{"userrole":"Admin",${createString.substring(0, createString.length - 1)}}`);

      expect(res.status).toBe(201);

      const newUserrole = await database.getUserrole('Admin');

      expect(newUserrole.name).toMatch('Admin');
      allRights.forEach((right) => {
        expect(newUserrole.rules[right.propertie].allowed).toBe(false);
      });

      expect(res.body.name).toMatch('Admin');
      allRights.forEach((right) => {
        expect(res.body.rules[right.propertie].allowed).toBe(false);
      });
    });

    it('Updates the userrole guest from admin with action changeRights and returns it', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = false;
      });

      const userrole = new Userrole('Guest', rightsObject, ['Admin']);
      await database.addUserrole(userrole);

      let createString = '';
      allRights.forEach((right) => {
        createString += `"${right.propertie}":"false",`;
      });

      const res = await request.post('/api/updateUserrole?action=changeRights')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(`{"userrole":"Guest",${createString.substring(0, createString.length - 1)}}`);

      expect(res.status).toBe(201);

      const newUserrole = await database.getUserrole('Guest');

      expect(newUserrole.name).toMatch('Guest');
      allRights.forEach((right) => {
        expect(newUserrole.rules[right.propertie].allowed).toBe(false);
      });

      expect(res.body.name).toMatch('Guest');
      allRights.forEach((right) => {
        expect(res.body.rules[right.propertie].allowed).toBe(false);
      });
    });

    it('Updates the userrole with canBeEditedByUserroles and returns it', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      await database.addUserrole(new Userrole('Test1', rightsObject));
      await database.addUserrole(new Userrole('Test2', rightsObject));

      let createString = '';
      allRights.forEach((right) => {
        createString += `"${right.propertie}":"false",`;
      });

      const res = await request.post('/api/updateUserrole?action=changeRights')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(`{"userrole":"Admin",${createString.substring(0, createString.length - 1)},"canBeEditedByUserrole":["Test1","Test2"]}`);

      const newUserrole = await database.getUserrole('Admin');

      expect(newUserrole.name).toMatch('Admin');
      allRights.forEach((right) => {
        expect(newUserrole.rules[right.propertie].allowed).toBe(false);
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('Admin');
      allRights.forEach((right) => {
        expect(res.body.rules[right.propertie].allowed).toBe(false);
      });
    });
  });

  it('GET userroles returns all userroles', async () => {
    const allRights = Userrole.getUserroleRights();
    const rightsObject = {};
    allRights.forEach((right) => {
      rightsObject[right.propertie] = true;
    });

    const userroles = [];
    for (let i = 0; i < 10; i += 1) {
      userroles.push(new Userrole(`Admin${i}`, rightsObject, (i > 1) ? [`Admin${i - 1}`] : []));
    }

    await userroles.reduce(async (memo, user) => {
      await memo;
      await database.addUserrole(user);
    }, undefined);

    const res = await request.get('/api/userroles?user=Admin')
      .set('Content-Type', 'application/json')
      .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`]);

    expect(res.status).toBe(201);
    expect(res.body.length).toBe(10);

    for (let i = 0; i < 10; i += 1) {
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: userroles[i].name,
            rules: userroles[i].rules,
            canBeEditedByUserrole: (i > 1) ? expect.arrayContaining([
              expect.objectContaining({
                name: `Admin${i - 1}`,
              }),
            ]) : [],
          }),
        ]),
      );
    }
  });
});
