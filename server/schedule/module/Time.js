module.exports = class Time {
  /**
   *
   * @param {Array} days Array of numbers that indicate the days to trigger the event 1-7
   * @param {Date} timeofday Date object with the time of the day to trigger at
   */
  constructor(days, timeofday) {
    this.days = days;
    this.timeofday = timeofday;
  }

  toCron() {
    return `${this.timeofday.getMinutes()} ${this.timeofday.getHours()} * * ${this.days.join(',')}`;
  }
};
