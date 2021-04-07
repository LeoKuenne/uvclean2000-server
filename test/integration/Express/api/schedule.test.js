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
const CreateEvent = require('../../../../server/commands/Scheduler/CreateEvent');
const UpdateEvent = require('../../../../server/commands/Scheduler/UpdateEvent');
const DeleteEvent = require('../../../../server/commands/Scheduler/DeleteEvent');
const TestEvent = require('../../../../server/commands/Scheduler/TestEvent');

let request = null;
let group = null;
let expressServer = null;
let agenda = null;
let database = null;
let server = null;
const io = new EventEmitter();
const mqtt = {
  publish: (topic, message) => {
    console.log(topic, message);
  },
};

const itSchedulerRuntime = () => ((process.env.SCHEDULERRUNTIME === true) ? it : it.skip);

describe('Express schedule route testing', () => {
  beforeAll(async () => {
    server = new EventEmitter();
    server.on('error', (e) => { });
    database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
    agenda = new AgendaScheduler(global.__MONGO_URI__, server, database, mqtt);
    // agenda = new AgendaScheduler('mongodb://192.168.178.66/agenda', server, database, mqtt);
    await database.connect();
    await database.clearCollection('users');
    await database.clearCollection('userroles');
    await TestUtitities.createUserUserroleAdmin(database);

    await agenda.startScheduler(mqtt, io);

    expressServer = new ExpressServer(server, database, agenda);
    expressServer.startExpressServer();
    request = supertest(expressServer.app);

    group = await database.addGroup({ name: 'Test Group' });

    CreateEvent.register(database, agenda);
    UpdateEvent.register(database, agenda);
    DeleteEvent.register(database, agenda);
    TestEvent.register(database, agenda);
  });

  afterAll(async () => {
    await agenda.stopScheduler();
    await database.close();
    expressServer.stopExpressServer();
  });

  describe('GET /api/events', () => {
    beforeEach(async () => {
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
      const scheduledEvents = [];
      for (let i = 0; i < 10; i += 1) {
        scheduledEvents.push(new ScheduleEvent(undefined,
          `Test${i}`,
          new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
          [
            new Action(group._id.toString(), 'engineState', 'true'),
          ]));
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
              id: expect.anything(),
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
      await agenda.deleteEvents();
    });

    it('returns 404 if no events exists', async () => {
      const res = await request.get('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ id: '123' });

      expect(res.status).toBe(404);
    });

    it('returns event object', async () => {
      const savedEvent = await agenda.addEvent(new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]));

      const res = await request.get('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ id: savedEvent.id });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: savedEvent.name,
          time: {
            days: savedEvent.time.days,
            timeofday: savedEvent.time.timeofday.toISOString(),
          },
          actions: savedEvent.actions,
        }),
      );
    });
  });

  describe('POST /api/event', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
    });

    it('creates event and returns it', async () => {
      const scheduledEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);

      const res = await request.post('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(scheduledEvent);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.anything(),
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
      const scheduledEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);

      const res = await request.post('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send(scheduledEvent);

      expect(res.status).toBe(201);

      const dbScheduledEvent = await agenda.getEvent(res.body.id);
      expect(dbScheduledEvent.id).toBeDefined();
      expect(dbScheduledEvent).toEqual(expect.objectContaining({
        name: scheduledEvent.name,
        actions: scheduledEvent.actions,
        time: scheduledEvent.time,
      }));
    });

    itSchedulerRuntime()('creates event object that runs', async (done) => {
      await database.addDevice({
        serialnumber: '1',
        name: 'TestGeraet1',
      });

      await database.addDeviceToGroup('1', group._id.toString());

      const triggerTime = new Date(Date.now() + 1000 * 60);
      const scheduledEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], triggerTime),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);

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

  describe('PUT /api/event', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
    });

    it('updates an event and returns it', async () => {
      const event = await agenda.addEvent(new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]));

      event.name = 'Test2';
      event.time = new Time([1, 2], new Date(Date.now() + 1000 * 30));
      event.actions.push(new Action(group._id.toString(), 'engineLevel', '1'));

      const res = await request.put('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ scheduledEvent: event });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: event.id.toString(),
          name: event.name,
          time: {
            days: event.time.days,
            timeofday: event.time.timeofday.toISOString(),
          },
          actions: event.actions,
        }),
      );
    });

    it('updates an event object in database', async () => {
      const event = await agenda.addEvent(new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]));

      event.name = 'Test2';
      event.time = new Time([1, 2], new Date(Date.now() + 1000 * 30));
      event.actions.push(new Action(group._id.toString(), 'engineLevel', '1'));

      const res = await request.put('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ scheduledEvent: event });

      expect(res.status).toBe(201);

      const dbScheduledEvent = await agenda.getEvent(res.body.id);
      expect(dbScheduledEvent).toEqual(event);
    });

    it('returns 401 if body properties are missing', async () => {
      const res = await request.put('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.msg).toEqual('The event has to been defined');
    });

    it('returns 401 if the id is not defined', async () => {
      const scheduledEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);

      const res = await request.put('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ scheduledEvent });

      expect(res.body.msg).toEqual('Event can not be updated when the id is not defined');
      expect(res.status).toBe(401);
    });

    itSchedulerRuntime()('updates event object that runs at the new time', async (done) => {
      await database.addDevice({
        serialnumber: '1',
        name: 'TestGeraet1',
      });

      await database.addDeviceToGroup('1', group._id.toString());

      const triggerTime = new Date(Date.now() + 1000 * 60);

      const event = await agenda.addEvent(new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now() - 1000 * 60)),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]));

      event.time = new Time([1, 2, 3, 4, 5, 6, 7], triggerTime);

      const res = await request.put('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ scheduledEvent: event });

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
      await agenda.deleteEvents();
    });

    it('deletes event object in database', async () => {
      const savedEvent = await agenda.addEvent(new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]));

      const res = await request.delete('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ id: savedEvent.id });

      expect(res.status).toBe(201);

      try {
        await agenda.getEvent('Test1');
      } catch (error) {
        expect(error.message).toMatch('The event does not exists');
      }
    });

    it('returns 401 if id is not defined', async () => {
      const res = await request.delete('/api/scheduler/event')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.msg).toEqual('id has to be defined and of type string');
    });
  });

  describe('POST /api/testevent', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
    });

    it('returns 401 if the id is not defined', async () => {
      const res = await request.post('/api/scheduler/testevent')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send();

      expect(res.body.msg).toEqual('Event can not be tested when the id is not defined');
      expect(res.status).toBe(401);
    });

    it('returns 404 if the event does not exists', async () => {
      const res = await request.post('/api/scheduler/testevent')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ id: 'Test1' });

      expect(res.body.msg).toEqual('The event does not exists');
      expect(res.status).toBe(404);
    });

    it('immediately runs the event', async (done) => {
      await database.addDevice({
        serialnumber: '1',
        name: 'TestGeraet1',
      });

      await database.addDeviceToGroup('1', group._id.toString());

      const savedEvent = await agenda.addEvent(new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now() - 1000 * 60)),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]));

      mqtt.publish = (topic, message) => {
        try {
          expect(topic).toMatch('UVClean/1/changeState/engineState');
          expect(message).toMatch('true');
          done();
        } catch (error) {
          done(error);
        }
      };

      const res = await request.post('/api/scheduler/testevent')
        .set('Content-Type', 'application/json')
        .set('cookie', [`UVCleanSID=${TestUtitities.createJWTToken('Admin')}`])
        .send({ id: savedEvent.id });

      expect(res.status).toBe(201);
    });
  });
});
