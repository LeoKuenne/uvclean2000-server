global.config = {
  http: { secure: false },
  mqtt: {
    sendEngineLevelWhenOn: false,
    useEncryption: false,
  },
};

const supertest = require('supertest');
const { EventEmitter } = require('events');
const AgendaScheduler = require('../../../../server/schedule/agenda');
const ExpressServer = require('../../../../server/ExpressServer/ExpressServer');
const MongoDBAdapter = require('../../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const TestUtitities = require('../../../TestUtitities');
const Time = require('../../../../server/schedule/module/Time');
const ScheduleEvent = require('../../../../server/schedule/module/ScheduleEvent');
const Action = require('../../../../server/schedule/module/Action');

let request = null;

let expressServer = null;
let agenda = null;
let database = null;
let server = null;
const mqtt = {
  publish: (topic, message) => {
    console.log(topic, message);
  },
};

beforeAll(async () => {
  server = new EventEmitter();
  server.on('error', (e) => { console.error(e); });
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  agenda = new AgendaScheduler(global.__MONGO_URI__, server, database, mqtt);
  // agenda = new AgendaScheduler('mongodb://192.168.178.66/agenda', server, database, mqtt);
  await database.connect();
  await agenda.startScheduler();
  expressServer = new ExpressServer(server, database, agenda);
  expressServer.startExpressServer();
  request = supertest(expressServer.app);
});

afterAll(async () => {
  await agenda.stopScheduler();
  await database.close();
  expressServer.stopExpressServer();
});

describe('Express schedule route testing', () => {
  describe('GET /api/events', () => {
    beforeEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
      await agenda.deleteEvents();
    });

    it('returns empty array if no events exists', async () => {
      const res = await request.get('/api/scheduler/events')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send();

      expect(res.status).toBe(201);
      expect(res.body).toEqual([]);
    });

    it('returns array with events', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

      const scheduledEvents = [];
      for (let i = 0; i < 10; i += 1) {
        scheduledEvents.push(new ScheduleEvent(
          `Test${i}`,
          new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
          [
            new Action(group._id.toString(), 'engineState', 'true'),
          ],
        ));
      }

      await scheduledEvents.reduce(async (memo, event) => {
        await memo;
        await agenda.addEvent(event);
      }, undefined);

      const res = await request.get('/api/scheduler/events')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send();

      expect(res.status).toBe(201);
      for (let i = 0; i < 10; i += 1) {
        expect(res.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: scheduledEvents[i].name,
              time: {
                days: scheduledEvents[i].time.days,
                timeofday: scheduledEvents[i].time.timeofday.toISOString(),
              },
              actions: scheduledEvents[i].actions,
            }),
          ]),
        );
      }
    });
  });

  describe('GET /api/event', () => {
    beforeEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
      await agenda.deleteEvents();
    });

    it('returns 404 if no events exists', async () => {
      const res = await request.get('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ name: 'Test1' });

      expect(res.status).toBe(404);
    });

    it('returns event object', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

      const scheduledEvents = [];
      for (let i = 0; i < 10; i += 1) {
        scheduledEvents.push(new ScheduleEvent(
          `Test${i}`,
          new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
          [
            new Action(group._id.toString(), 'engineState', 'true'),
          ],
        ));
      }

      await scheduledEvents.reduce(async (memo, event) => {
        await memo;
        await agenda.addEvent(event);
      }, undefined);

      const res = await request.get('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ name: 'Test1' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          name: scheduledEvents[1].name,
          time: {
            days: scheduledEvents[1].time.days,
            timeofday: scheduledEvents[1].time.timeofday.toISOString(),
          },
          actions: scheduledEvents[1].actions,
        }),
      );
    });
  });

  describe('POST /api/event', () => {
    beforeEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
      await agenda.deleteEvents();
    });

    it('creates event and returns it', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

      const scheduledEvent = new ScheduleEvent(
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ],
      );

      const res = await request.post('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(scheduledEvent);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          name: scheduledEvent.name,
          time: {
            days: scheduledEvent.time.days,
            timeofday: scheduledEvent.time.timeofday.toISOString(),
          },
          actions: scheduledEvent.actions,
        }),
      );
    });

    it('creates event object in database', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

      const scheduledEvent = new ScheduleEvent(
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ],
      );

      const res = await request.post('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(scheduledEvent);

      expect(res.status).toBe(201);

      const dbScheduledEvent = await agenda.getEvent('Test1');
      expect(dbScheduledEvent).toEqual(scheduledEvent);
    });

    it('creates event object that runs', async (done) => {
      const group = await database.addGroup({ name: 'Test Group' });
      await database.addDevice({
        serialnumber: '1',
        name: 'TestGeraet1',
      });

      await database.addDeviceToGroup('1', group._id.toString());

      const triggerTime = new Date(Date.now() + 1000 * 60);
      const scheduledEvent = new ScheduleEvent(
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], triggerTime),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ],
      );

      const res = await request.post('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(scheduledEvent);

      expect(res.status).toBe(201);

      mqtt.publish = (topic, message) => {
        try {
          expect(new Date(Date.now()).getHours()).toEqual(triggerTime.getHours());
          expect(new Date(Date.now()).getMinutes()).toEqual(triggerTime.getMinutes());
          expect(topic).toMatch('UVClean/1/changeState/engineState');
          expect(message).toMatch('true');
          done();
        } catch (error) {
          done(error);
        }
      };
    }, 1000 * 70);
  });

  describe('DELETE /api/event', () => {
    beforeEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
      await agenda.deleteEvents();
    });

    it('deletes event object in database', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

      const scheduledEvent = new ScheduleEvent(
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ],
      );

      await agenda.addEvent(scheduledEvent);

      const res = await request.delete('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ name: scheduledEvent.name });

      expect(res.status).toBe(201);

      try {
        await agenda.getEvent('Test1');
      } catch (error) {
        expect(error.message).toMatch('The event exists mulipletimes or does not exists');
      }
    });
  });
});
