const EventEmitter = require('events');
const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const AgendaScheduler = require('../../../server/schedule/agenda');
const Action = require('../../../server/schedule/module/Action');
const ScheduleEvent = require('../../../server/schedule/module/ScheduleEvent');
const Time = require('../../../server/schedule/module/Time');

global.config = {
  mqtt: {
    sendEngineLevelWhenOn: false,
    useEncryption: false,
  },
};

let database = null;
let agenda = null;
const server = new EventEmitter();
const mqtt = {};

beforeAll(async () => {
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
  agenda = new AgendaScheduler(`${global.__MONGO_URI__}`, server, database, mqtt);
  // agenda = new AgendaScheduler('mongodb://192.168.178.66/agenda', server, database, mqtt);
  await agenda.startScheduler();
});

afterAll(async () => {
  await agenda.stopScheduler();
  await agenda.forceStopScheduler();
  agenda = null;
  await database.close();
});

describe('Scheduling with agenda', () => {
  describe('addEvent', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
      await database.clearCollection('groups');
    });

    it('adds an event', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

      const scheduledEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);

      await agenda.addEvent(scheduledEvent);

      const event = await agenda.getEvent('Test1');
      expect(event.id).toBeDefined();
      expect(event).toEqual(expect.objectContaining({
        name: scheduledEvent.name,
        actions: scheduledEvent.actions,
        time: scheduledEvent.time,
      }));
    });
  });

  describe('getEvents', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
      await database.clearCollection('groups');
    });

    it('gets all events from database', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

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

      const events = await agenda.getEvents();
      events.forEach((event) => {
        expect(event.id).toBeDefined();
        expect(event).toEqual(expect.objectContaining({
          name: event.name,
          actions: event.actions,
          time: event.time,
        }));
      });
    });
  });

  describe('getEvent', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
      await database.clearCollection('groups');
    });

    it('throws an error if the event does not exists', async () => {
      try {
        await agenda.getEvent('Test2');
      } catch (error) {
        expect(error.message).toMatch('The event exists mulipletimes or does not exists');
      }
    });

    it('throws an error if the event exists multiple times', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

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

      try {
        await agenda.getEvent('Test2');
      } catch (error) {
        expect(error.message).toMatch('The event exists mulipletimes or does not exists');
      }
    });

    it('get a specific event from database', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

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

      const event = await agenda.getEvent('Test2');
      expect(event.id).toBeDefined();
      expect(event).toEqual(
        expect.objectContaining({
          name: scheduledEvents[2].name,
          actions: scheduledEvents[2].actions,
          time: scheduledEvents[2].time,
        }),
      );
    });
  });

  describe('deleteEvent', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
      await database.clearCollection('groups');
    });

    it('deleteEvent deletes an event', async () => {
      const group = await database.addGroup({ name: 'Test Group' });
      const scheduleEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);

      await agenda.addEvent(scheduleEvent);
      await agenda.deleteEvent(scheduleEvent);
      const events1 = await agenda.getEvents();
      expect(events1).toEqual([]);
    });
  });

  describe('updateEvent', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
      await database.clearCollection('groups');
    });

    it('throws an error if the event exists multiple times', async (done) => {
      const group = await database.addGroup({ name: 'Test Group' });

      await agenda.addEvent(new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]));
      const scheduledEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);
      const job = agenda.agenda.create('sendMQTTEvent', scheduledEvent).repeatEvery(scheduledEvent.time.toCron());
      await job.save();

      try {
        await agenda.updateEvent('Test1', scheduledEvent);
        done(new Error('addEvent did not throw'));
      } catch (error) {
        expect(error.message).toMatch('The event exists mulipletimes or does not exists');
        done();
      }
    });

    it('updates an event with the given object', async () => {
      const group = await database.addGroup({ name: 'Test Group' });

      const scheduledEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);
      await agenda.addEvent(scheduledEvent);

      scheduledEvent.time = new Time([1, 2, 3, 6, 7], new Date(Date.now() + 1000 * 2 * 60));
      scheduledEvent.actions.push(new Action(group._id.toString(), 'engineLevel', '1'));
      await agenda.updateEvent('Test1', scheduledEvent);

      const event = await agenda.getEvent('Test1');
      expect(event.id).toBeDefined();
      expect(event).toEqual(
        expect.objectContaining({
          name: scheduledEvent.name,
          actions: scheduledEvent.actions,
          time: scheduledEvent.time,
        }),
      );

      const jobsInDatabase = await agenda.agenda.jobs();
      expect(jobsInDatabase[0].attrs.repeatInterval).toMatch(scheduledEvent.time.toCron());
    });
  });

  describe('testEvent', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
      await database.clearCollection('groups');
    });

    it('throws an error if the event exists multiple times', async (done) => {
      try {
        await agenda.testEvent('Test1');
        done(new Error('addEvent did not throw'));
      } catch (error) {
        expect(error.message).toMatch('The event exists mulipletimes or does not exists');
        done();
      }
    });

    it('runs an event of the given name', async () => {
      await database.addDevice({
        serialnumber: '1',
        name: 'TestGeraet1',
      });

      const group = await database.addGroup({ name: 'Test Group' });
      await database.addDeviceToGroup('1', group._id.toString());

      const scheduledEvent = new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], new Date(Date.now())),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]);
      await agenda.addEvent(scheduledEvent);

      mqtt.publish = jest.fn();

      await agenda.testEvent('Test1');
      expect(mqtt.publish).toHaveBeenCalledTimes(1);
      expect(mqtt.publish).toHaveBeenCalledWith('UVClean/1/changeState/engineState', 'true');
    });
  });

  describe('Runtime test', () => {
    beforeEach(async () => {
      await agenda.deleteEvents();
      await database.clearCollection('groups');
    });

    it('adds an event one minute in the future and waits for it to run', async (done) => {
      const triggerTime = new Date(Date.now() + 1000 * 60);
      console.log(`Scheduled at ${(new Date(Date.now())).toISOString()}`);
      console.log(`Scheduled for ${triggerTime.toISOString()}`);

      await database.addDevice({
        serialnumber: '1',
        name: 'TestGeraet1',
      });

      const group = await database.addGroup({ name: 'Test Group' });
      await database.addDeviceToGroup('1', group._id.toString());

      mqtt.publish = (topic, message) => {
        console.log(topic, message);
        try {
          expect(new Date(Date.now()).getHours()).toEqual(triggerTime.getHours());
          expect(new Date(Date.now()).getMinutes()).toEqual(triggerTime.getMinutes());
          expect(topic).toEqual('UVClean/1/changeState/engineState');
          expect(message).toEqual('true');
          done();
        } catch (error) {
          done(error);
        }
      };

      await agenda.addEvent(new ScheduleEvent(undefined,
        'Test1',
        new Time([1, 2, 3, 4, 5, 6, 7], triggerTime),
        [
          new Action(group._id.toString(), 'engineState', 'true'),
        ]));
    }, 1000 * 70);
  });
});
