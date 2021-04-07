const CreateEvent = require('../../../../server/commands/Scheduler/CreateEvent');
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
  addEvent: jest.fn(),
};

beforeAll(() => {
  CreateEvent.register(database, scheduler);
});

describe('CreateEvent Command', () => {
  it('creates an event in database', async () => {
    const time = new Time([1, 2, 3, 4, 5, 6, 7], new Date(21, 1, 1, 12, 0, 0, 0));
    const actions = [
      new Action('123', 'engineState', 'true'),
    ];
    await CreateEvent.execute('admin', 'Test Event', time, actions);
    expect(scheduler.addEvent).toHaveBeenCalledWith(
      new ScheduleEvent(undefined, 'Test Event', time, actions),
    );
  });

  it('creates an event with empty actions', async () => {
    const time = new Time([1, 2, 3, 4, 5, 6, 7], new Date(1, 1, 1, 12, 0, 0, 0));
    await CreateEvent.execute('admin', 'Test Event', time);
    expect(scheduler.addEvent).toHaveBeenCalledWith(
      new ScheduleEvent(undefined, 'Test Event', time, []),
    );
  });

  it('creates an event with empty time', async () => {
    await CreateEvent.execute('admin', 'Test Event');
    expect(scheduler.addEvent).toHaveBeenCalledWith(
      new ScheduleEvent(undefined, 'Test Event', new Time([], new Date(1, 1, 1, 12, 0, 0, 0)), []),
    );
  });

  it('returns new scheduled event', async () => {
    scheduler.addEvent = (x) => x;
    await expect(CreateEvent.execute('admin', 'Test Event'))
      .resolves
      .toEqual(new ScheduleEvent(undefined, 'Test Event', new Time([], new Date(1, 1, 1, 12, 0, 0, 0)), []));
  });

  it('throws an error if user is not permitted', async () => {
    await expect(CreateEvent.execute('guest', 'Test Event'))
      .rejects.toThrow('Userrole guest can not create an event');
  });
});
