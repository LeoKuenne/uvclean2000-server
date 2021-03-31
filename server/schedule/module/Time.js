module.exports = class Time {
  constructor(days, timeofday) {
    this.days = days;
    this.timeofday = timeofday;
  }

  toCron() {
    return `${this.timeofday.getMinutes()} ${this.timeofday.getHours()} * * ${this.days.join(',')}`;
  }
};
