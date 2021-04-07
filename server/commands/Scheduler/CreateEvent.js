const ScheduleEvent = require('../../schedule/module/ScheduleEvent');
const Action = require('../../schedule/module/Action');
const Time = require('../../schedule/module/Time');
const AuthenticationError = require('../../errors/AuthenticationError');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'CreateScheduleEventCommand' });

let database = null;
let scheduler = null;

module.exports = {
  /**
   * Registers the database Adapter
   * @param {MongoDBAdapter} db
   * @param {AgendaScheduler} schedulerModule
   */
  register(db, schedulerModule) {
    database = db;
    scheduler = schedulerModule;
    logger.info('CreateScheduleEventCommand registered');
  },
  /**
   * Checks for the user to be able to create the event and creates the event
   * @param {String} usernameActionPerformedBy The username of the user the action is perfomed by
   * @param {String} name The name of the event to add
   * @param {Object} time The time object with days and time of the day to execute at
   * @param {Array} time.days The days to execute at. Valid numbers are 1-7. Defaults to be empty
   * @param {Date} time.timeofday An Date object with time to execute at. Defaults to 12 o'clock
   * @param {Array} actions Array of actions to perform at the event. Defaults to be empty
   * @returns {ScheduleEvent}
   */
  async execute(usernameActionPerformedBy, name, time = { days: [], timeofday: new Date(1, 1, 1, 12, 0, 0, 0) }, actions = []) {
    logger.info('Executing CreateScheduleEventCommand to create event %s with time object %o and actions %o', name, time, actions);

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditScheduler.allowed) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not create an event`);
    }

    return scheduler.addEvent(
      new ScheduleEvent(undefined, name, new Time(time.days, new Date(time.timeofday)),
        actions.map((action) => new Action(action.group, action.propertie, action.newValue))),
    );
  },
};
