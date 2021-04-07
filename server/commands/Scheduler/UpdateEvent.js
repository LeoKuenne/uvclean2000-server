const AuthenticationError = require('../../errors/AuthenticationError');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UpdateScheduledEventCommand' });

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
    logger.info('UpdateScheduledEventCommand registered');
  },
  /**
   * Checks for the user to be able to update the event and updates the event
   * @param {String} usernameActionPerformedBy The username of the user the action is perfomed by
   * @param {ScheduleEvent} scheduledEvent The scheduled event to update with
   * @returns {ScheduleEvent}
   */
  async execute(usernameActionPerformedBy, scheduledEvent) {
    logger.info('Executing UpdateScheduledEventCommand to update event %o', scheduledEvent);

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditScheduler.allowed) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not update an event`);
    }

    if (scheduledEvent.id === undefined) throw new Error('Event can not be updated when the id is not defined');

    return scheduler.updateEvent(scheduledEvent);
  },
};
