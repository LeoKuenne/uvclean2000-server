const AuthenticationError = require('../../errors/AuthenticationError');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'TestScheduledEventCommand' });

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
    logger.info('TestScheduledEventCommand registered');
  },
  /**
   * Checks for the user to be able to update the event and updates the event
   * @param {String} usernameActionPerformedBy The username of the user the action is perfomed by
   * @param {String} scheduledEventId The scheduled event id to delete
   */
  async execute(usernameActionPerformedBy, scheduledEventId) {
    logger.info('Executing TestScheduledEventCommand to test event with id %s', scheduledEventId);

    const dbUserActionPerfomedBy = await database.getUser(usernameActionPerformedBy);

    if (!dbUserActionPerfomedBy.userrole.rules.canEditScheduler.allowed) {
      throw new AuthenticationError(dbUserActionPerfomedBy.userrole.name, `Userrole ${dbUserActionPerfomedBy.userrole.name} can not test an event`);
    }

    if (scheduledEventId === undefined) throw new Error('Event can not be tested when the id is not defined');

    return scheduler.testEvent(scheduledEventId);
  },
};
