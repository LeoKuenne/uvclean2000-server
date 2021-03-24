global.config = {
  http: { secure: false },
};

/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
const supertest = require('supertest');
const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');
const ExpressServer = require('../../server/ExpressServer/ExpressServer');
const MongoDBAdapter = require('../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const User = require('../../server/dataModels/User');
const Userrole = require('../../server/dataModels/Userrole');
const CreateUserCommand = require('../../server/commands/UserCommand/CreateUserCommand');
const ChangeUserPasswordCommand = require('../../server/commands/UserCommand/ChangeUserPasswordCommand');
const ChangeUserroleCommand = require('../../server/commands/UserCommand/ChangeUserUserroleCommand');
const CreateUserroleCommand = require('../../server/commands/UserCommand/CreateUserroleCommand');
const DeleteUserroleCommand = require('../../server/commands/UserCommand/DeleteUserroleCommand');

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
  server.on('error', (e) => { console.error(e); });
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
});

afterAll(async () => {
  await database.close();
  expressServer.stopExpressServer();
});

describe('Express Route testing', () => {
  beforeEach(() => {
    database.clearCollection('uvcdevices');
    database.clearCollection('uvcgroups');
    database.clearCollection('airvolumes');
    // database.clearCollection('users');
  });

  describe('api routes', () => {
    it('GET /api/devices', async (done) => {
      const devices = [];
      for (let i = 0; i < 10; i += 1) {
        const dev = await database.addDevice({ serialnumber: `${i}`, name: `Test ${i}` });
        devices.push({
          id: dev._id.toString(),
          serialnumber: `${i}`,
          name: `Test ${i}`,
          group: {},
          engineState: false,
          engineLevel: 0,
          alarmState: false,
          currentCO2: { co2: '' },
          currentTVOC: { tvoc: '' },
          currentFanVoltage: { voltage: '' },
          currentBodyState: { state: '' },
          currentFanState: { state: '' },
          currentLampState: [],
          currentLampValue: [],
          eventMode: false,
          tacho: { tacho: 0 },
          currentAirVolume: { volume: 0 },
        });
      }

      const res = await request.get('/api/devices');
      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual(devices);
      done();
    });

    it('GET /api/groups', async (done) => {
      const groups = [];
      for (let i = 0; i < 10; i += 1) {
        const group = await database.addGroup({ name: `Test ${i}` });

        groups.push({
          devices: [],
          id: `${group._id}`,
          name: `Test ${i}`,
          alarmState: false,
          engineLevel: 0,
          engineLevelDevicesWithOtherState: [],
          engineState: false,
          engineStateDevicesWithOtherState: [],
          eventMode: false,
          eventModeDevicesWithOtherState: [],
        });
      }

      const res = await request.get('/api/groups');
      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual(groups);
      done();
    });

    it('GET /api/serialnumbers', async (done) => {
      const serialnumbers = [];
      for (let i = 0; i < 10; i += 1) {
        serialnumbers.push(`${i}`);
        await database.addDevice({ serialnumber: `${i}`, name: `Test ${i}` });
      }

      const res = await request.get('/api/serialnumbers');
      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual(serialnumbers);
      done();
    });

    it('GET /api/deviceData responses with 404 if no propertie is queried', async (done) => {
      const device = {
        serialnumber: '1',
        name: 'Test 1',
      };
      await database.addDevice(device);

      const res = await request.get('/api/deviceData').query({ device: '1' });
      expect(res.status).toBe(404);
      done();
    });

    it('GET /api/deviceData responses with all properties', async (done) => {
      const device = {
        serialnumber: '1',
        name: 'Test 1',
      };
      await database.addDevice(device);

      const volumes = [];
      for (let i = 0; i < 10; i += 1) {
        volumes.push({
          device: '1',
          volume: 10 * i,
          date: new Date((i + 1) * 10000),
        });
        await database.addAirVolume(volumes[i]);
      }

      const res = await request.get('/api/deviceData')
        .query({ device: '1' })
        .query({ propertie: 'airVolume' });
      expect(res.status).toBe(200);
      for (let i = 0; i < 10; i += 1) {
        expect(res.body[i].device).toBe(device.serialnumber);
        expect(res.body[i].date).toBe(volumes[i].date.toISOString());
        expect(res.body[i].volume).toBe(volumes[i].volume);
      }
      done();
    });

    it('GET /api/timestamps responses with all', async (done) => {
      const device = {
        serialnumber: '1',
        name: 'Test 1',
      };
      await database.addDevice(device);

      const volumes = [];
      for (let i = 0; i < 10; i += 1) {
        volumes.push({
          device: '1',
          volume: 10 * i,
          date: new Date(i * 10000),
        });
      }

      await Promise.all(
        volumes.map(async (v) => {
          await database.addAirVolume(v);
        }),
      );

      const res = await request.get('/api/timestamps')
        .query({ device: '1' })
        .query({ propertie: 'airVolume' });

      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual({
        from: new Date(0).toISOString(),
        to: new Date(9 * 10000).toISOString(),
      });
      done();
    });

    describe.only('GET /api/user', () => {
      afterAll(async () => {
        await database.clearCollection('users');
        await database.clearCollection('userroles');
      });

      it('GET /api/user', async () => {
        const userrole = await database.addUserrole(new Userrole('Admin', true, true));
        const user = await database.addUser(new User('admin', 'TestPassword', 'Admin'));

        const res = await request.get('/api/user')
          .query({ username: 'admin' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          user: {
            id: user._id.toString(),
            username: user.username,
            userrole: {
              _id: userrole._id.toString(),
              canChangeProperties: userrole.canChangeProperties,
              canEditUserrole: userrole.canEditUserrole.toObject(),
              canViewAdvancedData: userrole.canViewAdvancedData,
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
    });

    describe.only('GET /api/users', () => {
      afterAll(async () => {
        await database.clearCollection('users');
        await database.clearCollection('userroles');
      });

      it('GET /api/users', async () => {
        const userrole = await database.addUserrole(new Userrole('Admin', true, true));

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
                  _id: userrole._id.toString(),
                  canChangeProperties: userrole.canChangeProperties,
                  canEditUserrole: userrole.canEditUserrole.toObject(),
                  canViewAdvancedData: userrole.canViewAdvancedData,
                  name: userrole.name,
                },
              }),
            ]),
          );
        }
      });
    });

    describe('POST /api/deleteUserrole', () => {
      beforeAll(async () => {
        await database.addUserrole(new Userrole('Guest', true, true));
      });

      afterAll(async () => {
        await database.clearCollection('userroles');
        await database.clearCollection('users');
      });

      it('Deletes an userrole and returns it', async () => {
        const res = await request.post('/api/deleteUserrole?user=Test')
          .set('Content-Type', 'application/json')
          .set('cookie', [`UVCleanSID=${token}`])
          .send('{"userrolename":"Guest"}');

        expect(res.status).toBe(201);
        expect(res.body.name).toMatch('Guest');
        expect(res.body.canChangeProperties).toBe(true);
        expect(res.body.canViewAdvancedData).toBe(true);
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
        const res = await request.post('/api/createUserrole?user=Test')
          .set('Content-Type', 'application/json')
          .set('cookie', [`UVCleanSID=${token}`])
          .send('{"userrole":"Guest", "canChangeProperties":"true", "canViewAdvancedData":"true"}');

        expect(res.status).toBe(201);
        expect(res.body.name).toMatch('Guest');
        expect(res.body.canChangeProperties).toBe(true);
        expect(res.body.canViewAdvancedData).toBe(true);
      });

      it('returns 401 if no canChangePropertie is passed', async () => {
        const res = await request.post('/api/createUserrole?user=Test')
          .set('Content-Type', 'application/json')
          .set('cookie', [`UVCleanSID=${token}`])
          .send('{"userrole":"Guest", "canViewAdvancedData":"true"}');

        expect(res.status).toBe(401);
        expect(res.body.msg).toMatch('CanChangeProperties for the Userrole must be defined and of type boolean');
      });

      it('returns 401 if no canViewAdvancedData is passed', async () => {
        const res = await request.post('/api/createUserrole?user=Test')
          .set('Content-Type', 'application/json')
          .set('cookie', [`UVCleanSID=${token}`])
          .send('{"userrole":"Guest", "canChangeProperties":"true"}');

        expect(res.status).toBe(401);
        expect(res.body.msg).toMatch('CanViewAdvancedData for the Userrole must be defined and of type boolean');
      });
    });

    describe('POST /api/updateUser', () => {
      beforeAll(async () => {
        await database.addUserrole(new Userrole('Admin', true, true));
        await database.addUserrole(new Userrole('Guest', true, true));
        await database.addUser(new User('TestUsername', 'UsernamePassword', 'Admin'));
      });

      afterAll(async () => {
        await database.clearCollection('userroles');
        await database.clearCollection('users');
      });

      it('action changePassword changes the user password and returns the new user', async () => {
        const user = await database.getUser('TestUsername');
        const res = await request.post('/api/updateUser?user=Test&action=changePassword')
          .set('Content-Type', 'application/json')
          .set('cookie', [`UVCleanSID=${token}`])
          .send('{"username":"TestUsername", "oldPassword":"UsernamePassword", "newPassword":"NewPassword", "newPasswordRepeated":"NewPassword"}');

        expect(res.status).toBe(201);
        expect(res.body.password).toBeDefined();
        expect(res.body.username).toMatch('TestUsername');
        expect(res.body.userrole).toMatch(user.userrole.toString());
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

        const user = await database.getUser('TestUsername');

        expect(res.status).toBe(201);
        expect(res.body.username).toMatch('TestUsername');
        expect(res.body.userrole).toMatch(user.userrole.toString());
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
  });

  describe('user routes', () => {
    it('POST /addUser route responses with Status 201 and "Registerd!"', async (done) => {
      await database.addUserrole(new Userrole('Admin', true, true));

      const token = jwt.sign({
        username: 'Test',
        userId: '123',
      },
      'SECRETKEY', {
        expiresIn: '1d',
      });

      const res = await request.post('/addUser?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      expect(res.status).toBe(201);
      expect(res.body.msg).toMatch('Registered!');

      done();
    });

    it('POST /addUser route creates user in database', async (done) => {
      await database.addUserrole(new Userrole('Admin', true, true));

      const token = jwt.sign({
        username: 'Test',
        userId: '123',
      },
      'SECRETKEY', {
        expiresIn: '1d',
      });

      const res = await request.post('/addUser?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      const user = await database.getUser('TestUsername');

      expect(user.username).toMatch('TestUsername');

      done();
    });

    it('POST /addUser responses with 401 when user already exists', async (done) => {
      await database.addUserrole(new Userrole('Admin', true, true));
      await database.addUser(new User('TestUsername', 'UsernamePassword', 'Admin'));

      const token = jwt.sign({
        username: 'Test',
        userId: '123',
      },
      'SECRETKEY', {
        expiresIn: '1d',
      });

      const res = await request.post('/addUser?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      expect(res.body.msg).toMatch('User already exists');
      expect(res.status).toBe(401);

      done();
    });

    it('POST /login route returns token for user', async (done) => {
      await database.addUserrole(new Userrole('admin', true, true));
      const user = await database.addUser(new User('TestUsername', 'UsernamePassword', 'admin'));
      const res = await request.post('/login')
        .set('Content-Type', 'application/json')
        .send('{"username":"TestUsername", "password":"UsernamePassword"}');

      const token = jwt.sign({
        username: user.username,
        userId: user.id,
      },
      'SECRETKEY', {
        expiresIn: '1d',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        user: {
          id: user._id.toString(),
          username: user.username,
          password: user.password,
          userrole: user.userrole.toString(),
        },
        url: `/ui/managment?user=${user.username}`,
      });
      expect(res.header['set-cookie'][0]).toMatch(`UVCleanSID=${token}`);

      done();
    });
  });

  it('GET /ui/managment route returns 401 if not logged in', async (done) => {
    const res = await request.get('/ui/managment');

    expect(res.status).toBe(401);
    expect(res.text).toMatch('Your session is not valid');
    done();
  });

  it.skip('GET /login route returns 201 if logged in', async (done) => {
    await database.addUserrole(new Userrole('admin', true, true));
    await database.addUser(new User('TestUsername', 'UsernamePassword', 'admin'));
    const res = await request.post('/login')
      .set('Content-Type', 'application/json')
      .send('{"username":"TestUsername", "password":"UsernamePassword"}');

    expect(res.status).toBe(201);

    const ui = await request.get('/ui/managment').set('Authorization', `Bearer ${res.body.token}`);
    // console.log(ui);

    expect(ui.status).toBe(301);
    done();
  });
});
