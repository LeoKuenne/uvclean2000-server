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
   * Adds an event to database and returns the event with the id
   * @param {ScheduleEvent} event the event to add
   * @returns {ScheduleEvent}
   */
  async addEvent(event) {
    if (!(event instanceof ScheduleEvent)) throw new Error('event has to be defined and an instance of ScheduleEvent');
    logger.debug('Adding event %o', event);
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentName = jobsInDatabase.filter((job) => job.attrs.data.name === event.name);
    if (jobsWithCurrentName.length === 0) {
      logger.info('Adding schedule event to database %o', event);
      const job = this.agenda.create('sendMQTTEvent', event).repeatEvery(event.time.toCron());
      const savedJob = await job.save();
      return new ScheduleEvent(savedJob.attrs._id.toString(), event.name, event.time, event.actions);
    }
    throw new Error('Event already exists');
  }

  /**
   * Updates the event with the given name.
   * @param {ScheduleEvent} event The event to be updated with the new parameters
   */
  async updateEvent(event) {
    if (!(event instanceof ScheduleEvent)) throw new Error('event has to be defined and an instance of ScheduleEvent');
    logger.debug('Updating event %swith %o', event.name, event);
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentId = jobsInDatabase.filter((job) => job.attrs._id.toString() === event.id.toString());

    if (jobsWithCurrentId.length !== 1) throw new Error('The event does not exists');

    jobsWithCurrentId[0].attrs.data.name = event.name;
    jobsWithCurrentId[0].attrs.data.actions = event.actions;
    jobsWithCurrentId[0].repeatEvery(event.time.toCron());
    jobsWithCurrentId[0].attrs.data.time = event.time;
    jobsWithCurrentId[0].attrs.repeatInterval = event.time.toCron();
    const savedJob = await jobsWithCurrentId[0].save();

    return new ScheduleEvent(savedJob.attrs._id.toString(), savedJob.attrs.data.name,
      savedJob.attrs.data.time, savedJob.attrs.data.actions);
  }

  /**
   * Get a event with the given name that are scheduled from database
   * @param {string} id The id of the event to get
   * @returns {ScheduleEvent} scheduled event object
   */
  async getEvent(id) {
    if (typeof id !== 'string') throw new Error('id has to be defined and of type string');
    logger.debug('Getting event with id %s', id);
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentName = jobsInDatabase.filter((job) => job.attrs._id.toString() === id);
    if (jobsWithCurrentName.length !== 1) throw new Error('The event does not exists');

    return new ScheduleEvent(jobsWithCurrentName[0].attrs._id.toString(),
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
    return jobsInDatabase.map((job) => new ScheduleEvent(job.attrs._id.toString(),
      job.attrs.data.name,
      new Time(job.attrs.data.time.days, job.attrs.data.time.timeofday),
      job.attrs.data.actions.map((a) => new Action(a.group, a.propertie, a.newValue))));
  }

  /**
   * Delete the scheduled event with the given id
   * @param {String} id the event id to delete
   */
  async deleteEvent(id) {
    if (typeof id !== 'string') throw new Error('id has to be defined and of type string');
    logger.debug('Deleting event with %o', id);
    const jobsInDatabase = await this.agenda.jobs();
    jobsInDatabase.map((job) => {
      if (job.attrs._id.toString() === id) {
        logger.debug('Found event %s, removing it', id.name);
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
   * @param {String} id The id of the event to test
   * @returns {Promise}
   */
  async testEvent(id) {
    if (typeof id !== 'string') throw new Error('id has to be defined and of type string');
    logger.debug('Testing event %s', id);
    const jobsInDatabase = await this.agenda.jobs();
    const jobsWithCurrentName = jobsInDatabase.filter((job) => job.attrs._id.toString() === id);
    if (jobsWithCurrentName.length !== 1) throw new Error('The event does not exists');
    return jobsWithCurrentName[0].run();
  }
};
