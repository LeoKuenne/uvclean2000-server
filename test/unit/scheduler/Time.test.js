const Time = require('../../../server/schedule/module/Time');

describe('Time Object Unit test', () => {
  it('getCRON returns cron like format', () => {
    const time = new Time([1, 2, 3, 4], new Date(2020, 1, 1, 1, 30, 30));
    expect(time.toCron()).toMatch('30 1 * * 1,2,3,4');
  });

  it('throws error if time of day ist not specified', (done) => {
    try {
      new Time();
      done(new Error('Time did not throw'));
    } catch (error) {
      expect(error.message).toEqual('Time of day has to be defined and instance of Date');
      done();
    }
  });
});
