const AuthenticationError = require('../../errors/AuthenticationError');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'DeleteScheduledEventCommand' });

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
    logger.info('DeleteScheduledEventCommand registered');
  },
  /**
   * Checks for the user to be able to update the event and updates the event
   * @param {String} usernameActionPerformedBy The username of the user the action is perfomed by
   * @param {String} scheduledEventId The scheduled event id to delete
   */
  async execute(usernameActionPerformedBy, scheduledEventId) {
    logger.info('Executing DeleteScheduledEventCommand to delete event with id %s', scheduledEventId);

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditScheduler.allowed) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not delete an event`);
    }

    await scheduler.deleteEvent(scheduledEventId);
  },
};
