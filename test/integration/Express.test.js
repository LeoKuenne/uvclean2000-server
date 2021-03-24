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
const AddUserCommand = require('../../server/commands/UserCommand/AddUserCommand');

let request = null;

let expressServer = null;
let database = null;
let server = null;

beforeAll(async () => {
  server = new EventEmitter();
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
  expressServer = new ExpressServer(
    server,
    database,
  );
  expressServer.startExpressServer();
  request = supertest(expressServer.app);

  AddUserCommand.register(database);
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
    database.clearCollection('users');
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
  });

  describe('user routes', () => {
    it('POST /sign-up route responses with Status 201 and "Registerd!"', async (done) => {
      await database.addUserrole(new Userrole('Admin', true, true));

      const token = jwt.sign({
        username: 'Test',
        userId: '123',
      },
      'SECRETKEY', {
        expiresIn: '1d',
      });

      const res = await request.post('/sign-up?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      expect(res.status).toBe(201);
      expect(res.body.msg).toMatch('Registered!');

      done();
    });

    it('POST /sign-up route creates user in database', async (done) => {
      await database.addUserrole(new Userrole('Admin', true, true));

      const token = jwt.sign({
        username: 'Test',
        userId: '123',
      },
      'SECRETKEY', {
        expiresIn: '1d',
      });

      const res = await request.post('/sign-up?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      const user = await database.getUser('TestUsername');

      expect(user.username).toMatch('TestUsername');

      done();
    });

    it('POST /sign-up responses with 401 when user already exists', async (done) => {
      await database.addUserrole(new Userrole('Admin', true, true));
      await database.addUser(new User('TestUsername', 'UsernamePassword', 'Admin'));

      const token = jwt.sign({
        username: 'Test',
        userId: '123',
      },
      'SECRETKEY', {
        expiresIn: '1d',
      });

      server.on('error', (e) => console.log(e.error));

      const res = await request.post('/sign-up?user=Test')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${token}`])
        .send('{"username":"TestUsername", "password":"UsernamePassword", "password_repeat":"UsernamePassword", "userrole":"Admin"}');

      expect(res.body.msg).toMatch('User already exists');
      expect(res.status).toBe(401);

      server.removeAllListeners();

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
