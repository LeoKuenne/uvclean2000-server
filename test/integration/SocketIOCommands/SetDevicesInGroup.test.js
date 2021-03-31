const EventEmitter = require('events');
const Module = require('../../../server/commands/SocketIOCommands/SetDevicesInGroup');
const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');

let database;

expect.extend({
  toContainObject(received, argument) {
    const pass = this.equals(received,
      expect.arrayContaining([
        expect.objectContaining(argument),
      ]));

    if (pass) {
      return {
        message: () => (`expected ${this.utils.printReceived(received)} not to contain object ${this.utils.printExpected(argument)}`),
        pass: true,
      };
    }
    return {
      message: () => (`expected ${this.utils.printReceived(received)} to contain object ${this.utils.printExpected(argument)}`),
      pass: false,
    };
  },
});

beforeAll(async () => {
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
});

afterAll(async () => {
  await database.close();
});

describe('SetDevicesInGroup SocketIO Module', () => {
  afterEach(async () => {
    await database.clearCollection('uvcdevices');
    await database.clearCollection('uvcgroups');
    // jest.resetAllMocks();
  });

  it.each([
    [
      ['1', '2'], [], ['1', '2'], [], 2,
    ],
    [
      [], ['1', '2'], [], ['1', '2'], 2,
    ],
    [
      ['3', '4'], ['1', '2'], ['3', '4'], ['1', '2'], 4,
    ],
    [
      ['1', '2', '3', '4'], [], [], ['1', '2', '3', '4'], 4,
    ],
    [
      [], ['1', '2', '3', '4'], [], ['1', '2', '3', '4'], 4,
    ],
    [
      ['1', '3'], ['2', '4'], ['3'], ['1', '2', '4'], 4,
    ],
  ])('Sets %s in group, removes %s, adds %s, %s are members ', async (devicesToSet, devicesToRemove, devicesToAdd, devicesInGroup, totalDevices, done) => {
    const mqtt = new EventEmitter();
    const server = new EventEmitter();
    const io = new EventEmitter();
    const ioSocket = new EventEmitter();

    const devices = [];

    for (let i = 0; i < totalDevices; i += 1) {
      devices.push({
        name: `Test Gerat ${i + 1}`,
        serialnumber: `${i + 1}`,
      });
    }

    const group = await database.addGroup({
      name: 'Test Group',
    });

    await Promise.all(devices.map(async (device) => {
      await database.addDevice(device);
    }));

    await Promise.all(devicesInGroup.map(async (device) => {
      await database.addDeviceToGroup(device, group._id.toString());
    }));

    const spyAddDeviceToGroup = jest.spyOn(database, 'addDeviceToGroup');
    const spyDeleteDeviceFromGroup = jest.spyOn(database, 'deleteDeviceFromGroup');

    Module(server, database, io, mqtt, ioSocket);

    io.on('group_deviceAdded', async () => {
      try {
        expect(spyAddDeviceToGroup).toHaveBeenCalledTimes(devicesToAdd.length);
        for (let i = 0; i < devicesToAdd.length; i += 1) {
          expect(spyAddDeviceToGroup)
            .toHaveBeenNthCalledWith(i + 1, devicesToAdd[i], group._id.toString());
        }

        expect(spyDeleteDeviceFromGroup).toHaveBeenCalledTimes(devicesToRemove.length);
        for (let i = 0; i < devicesToRemove.length; i += 1) {
          expect(spyDeleteDeviceFromGroup)
            .toHaveBeenNthCalledWith(i + 1, devicesToRemove[i], group._id.toString());
        }

        const newGroup = await database.getGroup(group._id.toString());

        expect(newGroup.devices.length).toBe(devicesToSet.length);

        devicesToSet.forEach((dev) => {
          expect(newGroup.devices).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ serialnumber: dev }),
            ]),
          );
        });

        spyAddDeviceToGroup.mockRestore();
        spyDeleteDeviceFromGroup.mockRestore();
        done();
      } catch (e) {
        spyAddDeviceToGroup.mockRestore();
        spyDeleteDeviceFromGroup.mockRestore();
        done(e);
      }
    });

    ioSocket.emit('group_setDevices', {
      group: group._id.toString(),
      devices: devicesToSet,
    });
  });
});
