const TestEvent = require('../../../../server/commands/Scheduler/TestEvent');
const User = require('../../../../server/dataModels/User');
const Userrole = require('../../../../server/dataModels/Userrole');

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
  testEvent: jest.fn(),
};

beforeAll(() => {
  TestEvent.register(database, scheduler);
});

describe('TestEvent Command', () => {
  it('calls deleteEvent on scheduler', async () => {
    await TestEvent.execute('admin', '123');
    expect(scheduler.testEvent).toHaveBeenCalledWith('123');
  });

  it('throws an error if user is not permitted', async () => {
    await expect(TestEvent.execute('guest', 'Test Event'))
      .rejects.toThrow('Userrole guest can not test an event');
  });

  it('throws an error if id is not defined', async () => {
    await expect(TestEvent.execute('admin'))
      .rejects.toThrow('Event can not be tested when the id is not defined');
  });
});
