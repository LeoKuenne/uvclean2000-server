const UpdateEvent = require('../../../../server/commands/Scheduler/UpdateEvent');
const User = require('../../../../server/dataModels/User');
const Userrole = require('../../../../server/dataModels/Userrole');
const Action = require('../../../../server/schedule/module/Action');
const ScheduleEvent = require('../../../../server/schedule/module/ScheduleEvent');
const Time = require('../../../../server/schedule/module/Time');

const database = {
  getUser: (user) => {
    switch (user) {
      case 'admin':
        return new User('admin', 'adminPassword', new Userrole('admin', { canEditScheduler: true }));
      case 'guest':
        return new User('guest', 'guestPassword', new Userrole('guest', { canEditScheduler: false }));
      default:
        break;
    }
  },
};
const scheduler = {
  updateEvent: jest.fn(),
};

beforeAll(() => {
  UpdateEvent.register(database, scheduler);
});

describe('UpdateEvent Command', () => {
  it('updates an event in database', async () => {
    const time = new Time([1, 2, 3, 4, 5, 6, 7], new Date(21, 1, 1, 12, 0, 0, 0));
    const actions = [
      new Action('123', 'engineState', 'true'),
    ];
    const scheduledEvent = new ScheduleEvent('123', 'Test Event', time, actions);
    await UpdateEvent.execute('admin', scheduledEvent);
    expect(scheduler.updateEvent).toHaveBeenCalledWith(scheduledEvent);
  });

  it('returns new scheduled event', async () => {
    scheduler.updateEvent = (x) => x;
    const time = new Time([1, 2, 3, 4, 5, 6, 7], new Date(21, 1, 1, 12, 0, 0, 0));
    const actions = [
      new Action('123', 'engineState', 'true'),
    ];
    const scheduledEvent = new ScheduleEvent('123', 'Test Event', time, actions);
    expect(UpdateEvent.execute('admin', scheduledEvent))
      .resolves
      .toBe(scheduledEvent);
  });

  it('throws an error if user is not permitted', async () => {
    await expect(UpdateEvent.execute('guest', 'Test Event'))
      .rejects.toThrow('Userrole guest can not update an event');
  });

  it('throws an error if id is not defined', async () => {
    const scheduledEvent = new ScheduleEvent(undefined, 'Test Event',
      new Time([1, 2, 3, 4, 5, 6, 7], new Date(21, 1, 1, 12, 0, 0, 0)), [
        new Action('123', 'engineState', 'true'),
      ]);
    await expect(UpdateEvent.execute('admin', scheduledEvent))
      .rejects.toThrow('Event can not be updated when the id is not defined');
  });
});
