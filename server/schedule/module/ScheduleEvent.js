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
    if (name === undefined || typeof name !== 'string' || name.length <= 0) throw new Error('Name must be defined and of type string');
    if (time === undefined || !(time instanceof Time)) throw new Error('Time must be defined and an instance of Time');
    this.name = name;
    this.time = time;
    this.actions = actions;
  }
};
