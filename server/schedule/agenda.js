const Agenda = require('agenda');
const { MqttClient } = require('mqtt');
const MQTTGroupChangeState = require('../commands/MQTTCommands/MQTTGroupChangeState');
const Action = require('./module/Action');
const ScheduleEvent = require('./module/ScheduleEvent');
const Time = require('./module/Time');
const MainLogger = require('../Logger.js').logger;

const logger = MainLogger.child({ service: 'AgendaScheduler' });

module.exports = class AgendaScheduler {
  /**
   *
   * @param {string} mongoURI mongo database url
   * @param {MongoDBAdapter} database mongodb adapter
   * @param {MqttClient} mqtt mqtt client
   */
  constructor(mongoURI, server, database, mqtt) {
    this.server = server;
    this.mongoConnectionString = `${mongoURI}`;
    this.database = database;
    this.mqtt = mqtt;

    this.agenda = new Agenda({
      db: {
        address: this.mongoConnectionString,
        collection: 'agenda',
        options: {
          useUnifiedTopology: true,
        },
      },
    }, () => {
      logger.info('Scheduler connected to database');
    });

    this.agenda.on('start', (job) => {
      logger.info(`Job ${job.attrs.name} starting`);
    });

    this.agenda.on('success', (job) => {
      logger.info(`Job ${job.attrs.name} succeeded`);
    });

    this.agenda.on('fail', (error, job) => {
      this.server.emit('error', { message: `Job ${job.attrs.name} failed`, error });
      logger.error(`Job ${job.attrs.name} failed:`, error);
    });
  }

  async startScheduler() {
    await this.agenda.start();
    logger.info('Starting scheduler');

    logger.debug('Defining sendMQTT Event');
    this.agenda.define('sendMQTTEvent', async (job) => {
      const e = job.attrs.data;
      try {
        await e.actions.reduce(async (memo, action) => {
          try {
            await memo;
            const group = await this.database.getGroup(action.group);
            await MQTTGroupChangeState.execute(this.mqtt, group, action.propertie,
              action.newValue);
          } catch (error) {
            console.error(error);
          }
        }, undefined);
      } catch (error) {
        console.error(error);
      }
    });
  }

  async stopScheduler() {
    logger.info('Stopping scheduler');
    await this.agenda.stop();
  }

  async forceStopScheduler() {
    logger.info('Forcing stopping scheduler');
    await this.agenda.close({ force: true });
  }

  /**
   *
   * @param {ScheduleEvent} event
   */
  async addEvent(event) {
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentName = jobsInDatabase.filter((job) => job.attrs.data.name === event.name);
    if (jobsWithCurrentName.length === 0) {
      logger.info('Adding schedule event to database %o', event);
      const job = this.agenda.create('sendMQTTEvent', event).repeatEvery(event.time.toCron());
      await job.save();
      return event;
    }
    throw new Error('Event already exists');
  }

  /**
   *
   * @param {ScheduleEvent} event
   */
  async updateEvent(event) {
    const jobsInDatabase = await this.agenda.jobs({ name: event.name });
    if (jobsInDatabase !== undefined) throw new Error('Event already exists');

    // Modify job
    // Save job https://github.com/agenda/agenda#manually-working-with-a-job
  }

  /**
   * Get a event with the given name that are scheduled from database
   * @param {string} eventname The name of the event to get
   * @returns {Array<ScheduleEvent>} Array of schedule events that are scheduled
   */
  async getEvent(eventname) {
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentName = jobsInDatabase.filter((job) => job.attrs.data.name === eventname);

    if (jobsWithCurrentName.length !== 1) throw new Error('The event exists mulipletimes or does not exists');

    return new ScheduleEvent(jobsWithCurrentName[0].attrs.data.name,
      new Time(jobsWithCurrentName[0].attrs.data.time.days, jobsWithCurrentName[0].attrs.data.time.timeofday),
      jobsWithCurrentName[0].attrs.data.actions.map((a) => new Action(a.group, a.propertie, a.newValue)));
  }

  /**
   * Gets all events that are scheduled from database
   * @returns {Array<ScheduleEvent>} Array of schedule events that are scheduled
   */
  async getEvents() {
    const jobsInDatabase = await this.agenda.jobs();
    return jobsInDatabase.map((job) => new ScheduleEvent(job.attrs.data.name,
      new Time(job.attrs.data.time.days, job.attrs.data.time.timeofday),
      job.attrs.data.actions.map((a) => new Action(a.group, a.propertie, a.newValue))));
  }

  /**
   *
   * @param {ScheduleEvent} scheduleEvent
   */
  async deleteEvent(scheduleEvent) {
    const jobsInDatabase = await this.agenda.jobs();
    jobsInDatabase.map((job) => {
      if (job.attrs.data.name === scheduleEvent.name) {
        job.remove();
      }
      return job;
    });
  }

  /**
   * Deletes all Events in the database
   */
  async deleteEvents() {
    const jobsInDatabase = await this.agenda.jobs();
    jobsInDatabase.map((job) => {
      job.remove();
      return job;
    });
  }
};
