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
    logger.debug('Adding event %o', event);
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
   * Updates the event with the given name.
   * @param {String} eventname The name of the event to be updated
   * @param {ScheduleEvent} event The event to be updated with
   */
  async updateEvent(eventname, event) {
    logger.debug('Updating event %s with %o', eventname, event);
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentName = jobsInDatabase.filter((job) => job.attrs.data.name === eventname);

    if (jobsWithCurrentName.length !== 1) throw new Error('The event exists mulipletimes or does not exists');

    jobsWithCurrentName[0].attrs.data.name = event.name;
    await jobsWithCurrentName[0].save();
    jobsWithCurrentName[0].attrs.data.actions = event.actions;
    await jobsWithCurrentName[0].save();
    jobsWithCurrentName[0].repeatEvery(event.time.toCron());
    await jobsWithCurrentName[0].save();
    jobsWithCurrentName[0].attrs.data.time = event.time;
    await jobsWithCurrentName[0].save();
    jobsWithCurrentName[0].attrs.repeatInterval = event.time.toCron();
    await jobsWithCurrentName[0].save();

    // console.log(jobsWithCurrentName[0], event.actions);
    return event;
  }

  /**
   * Get a event with the given name that are scheduled from database
   * @param {string} eventname The name of the event to get
   * @returns {Array<ScheduleEvent>} Array of schedule events that are scheduled
   */
  async getEvent(eventname) {
    logger.debug('Getting event %s', eventname);
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentName = jobsInDatabase.filter((job) => job.attrs.data.name === eventname);
    if (jobsWithCurrentName.length !== 1) throw new Error('The event exists mulipletimes or does not exists');

    return new ScheduleEvent(jobsWithCurrentName[0].attrs._id,
      jobsWithCurrentName[0].attrs.data.name,
      new Time(jobsWithCurrentName[0].attrs.data.time.days,
        jobsWithCurrentName[0].attrs.data.time.timeofday),
      jobsWithCurrentName[0].attrs.data.actions.map(
        (a) => new Action(a.group, a.propertie, a.newValue),
      ));
  }

  /**
   * Gets all events that are scheduled from database
   * @returns {Array<ScheduleEvent>} Array of schedule events that are scheduled
   */
  async getEvents() {
    const jobsInDatabase = await this.agenda.jobs();
    return jobsInDatabase.map((job) => new ScheduleEvent(job.attrs._id, job.attrs.data.name,
      new Time(job.attrs.data.time.days, job.attrs.data.time.timeofday),
      job.attrs.data.actions.map((a) => new Action(a.group, a.propertie, a.newValue))));
  }

  /**
   *
   * @param {ScheduleEvent} scheduleEvent
   */
  async deleteEvent(scheduleEvent) {
    logger.debug('Deleting event %o', scheduleEvent);
    const jobsInDatabase = await this.agenda.jobs();
    jobsInDatabase.map((job) => {
      if (job.attrs.data.name === scheduleEvent.name) {
        logger.debug('Found event %s, removing it', scheduleEvent.name);
        job.remove();
      }
      return job;
    });
  }

  /**
   * Deletes all Events in the database
   */
  async deleteEvents() {
    logger.debug('Deleting all events');
    const jobsInDatabase = await this.agenda.jobs();
    jobsInDatabase.map((job) => {
      job.remove();
      return job;
    });
  }

  /**
   * Runs the given event as a test run
   * @param {String} eventname The name of the event to test
   * @returns {Promise}
   */
  async testEvent(eventname) {
    logger.debug('Testing event %s', eventname);
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentName = jobsInDatabase.filter((job) => job.attrs.data.name === eventname);
    if (jobsWithCurrentName.length !== 1) throw new Error('The event exists mulipletimes or does not exists');
    return jobsWithCurrentName[0].run();
  }
};
