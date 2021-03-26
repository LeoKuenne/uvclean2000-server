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

describe('Userrole api routes', () => {
  describe('POST /api/deleteUserrole', () => {
    beforeAll(async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });
      await database.addUserrole(new Userrole('Guest', rightsObject));
    });

    afterAll(async () => {
      await database.clearCollection('userroles');
      await database.clearCollection('users');
    });

    it('Deletes an userrole and returns it', async () => {
      const allRights = Userrole.getUserroleRights();

      const res = await request.post('/api/deleteUserrole?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"userrolename":"Guest"}');

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('Guest');
      allRights.forEach((right) => {
        expect(res.body[right.propertie]).toBe(true);
      });
    });

    it('returns 401 if no canChangePropertie is passed', async () => {
      const res = await request.post('/api/deleteUserrole?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{}');

      expect(res.status).toBe(401);
      expect(res.body.msg).toMatch('Userrolename has to be defined and of type string');
    });
  });

  describe('POST /api/createUserrole', () => {
    beforeEach(async () => {
      await database.clearCollection('userroles');
      await database.clearCollection('users');
    });

    it('Creates an userrole and returns it', async () => {
      const allRights = Userrole.getUserroleRights();

      let createString = '';
      allRights.forEach((right) => {
        createString += `"${right.propertie}":"true",`;
      });

      const res = await request.post('/api/createUserrole?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send(`{"userrole":"Guest", ${createString.substring(0, createString.length - 1)}}`);

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('Guest');
      allRights.forEach((right) => {
        expect(res.body.rules[right.propertie].allowed).toBe(true);
        expect(res.body.rules[right.propertie].desciption).toBe(right.desciption);
      });
    });

    it('Creates an userrole with canEditUserroles and returns it', async () => {
      const allRights = Userrole.getUserroleRights();

      const rightsObject = {};
      let createString = '';
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
        createString += `"${right.propertie}":"true",`;
      });

      database.addUserrole(new Userrole('Test1', rightsObject));

      const res = await request.post('/api/createUserrole?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send(`{"userrole":"Guest", ${createString.substring(0, createString.length - 1)},"canEditUserrole":["Test1"]}`);

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('Guest');
      allRights.forEach((right) => {
        expect(res.body.rules[right.propertie].allowed).toBe(true);
        expect(res.body.rules[right.propertie].desciption).toBe(right.desciption);
      });

      expect(res.body.canEditUserrole).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Test1',
          }),
        ]),
      );
    });

    it('returns 401 if not userrolename and rightproperties are passed', async (done) => {
      const allRights = Userrole.getUserroleRights();
      if (allRights.length === 0) throw new Error('Route can not return 401 because there is no rule to set');

      let createString = '';

      await allRights.reduce(async (memo, right) => {
        await memo;
        const res = await request.post('/api/createUserrole?user=Test')
          .set('Content-Type', 'application/json')
          .set('cookie', [`UVCleanSID=${token}`])
          .send(`{"userrole":"Guest"${createString}}`);

        try {
          expect(res.status).toBe(401);
          expect(res.body.msg).toMatch(`${right.propertie} for the Userrole must be defined and of type boolean`);
          done();
        } catch (error) {
          done(error);
        }
        createString += `,"${right.propertie}": "true"`;
      }, undefined);
    });
  });

  describe('POST /api/updateUserrole', () => {
    afterEach(async () => {
      await database.clearCollection('userroles');
      await database.clearCollection('users');
    });

    it('Updates the userrole with new Name if action is changeName and returns it', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      await database.addUserrole(userrole);

      const res = await request.post('/api/updateUserrole?action=changeName&user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"oldUsername":"Admin", "newUsername":"TestUser"}');

      const newUserrole = await database.getUserrole('TestUser');

      expect(newUserrole.name).toMatch('TestUser');

      expect(res.status).toBe(201);
      expect(res.body.name).toMatch('TestUser');
      allRights.forEach((right) => {
        expect(res.body[right.propertie]).toBe(true);
      });
    });

    it('Updates the userrole with action changeRights and returns it', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      await database.addUserrole(userrole);

      let createString = '';
      allRights.forEach((right) => {
        createString += `"${right.propertie}":"false",`;
      });

      const res = await request.post('/api/updateUserrole?action=changeRights&user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send(`{"userrole":"Admin",${createString.substring(0, createString.length - 1)}}`);

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

    it('Updates the userrole with canEditUserroles and returns it', async () => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = true;
      });

      const userrole = new Userrole('Admin', rightsObject);
      await database.addUserrole(userrole);
      await database.addUserrole(new Userrole('Test1', rightsObject));
      await database.addUserrole(new Userrole('Test2', rightsObject));

      let createString = '';
      allRights.forEach((right) => {
        createString += `"${right.propertie}":"false",`;
      });

      const res = await request.post('/api/updateUserrole?action=changeRights&user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send(`{"userrole":"Admin",${createString.substring(0, createString.length - 1)},"canEditUserrole":["Test1","Test2"]}`);

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

    const res = await request.get('/api/userroles?user=Test')
      .set('Content-Type', 'application/json')
      .set('cookie', [`UVCleanSID=${token}`]);

    expect(res.status).toBe(201);
    expect(res.body.length).toBe(10);

    for (let i = 0; i < 10; i += 1) {
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: userroles[i].name,
            rules: userroles[i].rules,
            canEditUserrole: (i > 1) ? expect.arrayContaining([
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
