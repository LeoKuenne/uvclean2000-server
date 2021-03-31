const Action = require('./Action');
const Time = require('./Time');

module.exports = class ScheduleEvent {
  /**
   *
   * @param {String} name Name of the event
   * @param {Time} time Time of the event to happen
   * @param {Array<Action>} actions Array of actions to perfom
   */
  constructor(name, time, actions = []) {
    this.name = name;
    this.time = time;
    this.actions = actions;
  }
};
