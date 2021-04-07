const DeleteEvent = require('../../../../server/commands/Scheduler/DeleteEvent');
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
  deleteEvent: jest.fn(),
};

beforeAll(() => {
  DeleteEvent.register(database, scheduler);
});

describe('DeleteEvent Command', () => {
  it('calls deleteEvent on scheduler', async () => {
    await DeleteEvent.execute('admin', '123');
    expect(scheduler.deleteEvent).toHaveBeenCalledWith('123');
  });

  it('throws an error if user is not permitted', async () => {
    await expect(DeleteEvent.execute('guest', 'Test Event'))
      .rejects.toThrow('Userrole guest can not delete an event');
  });
});
