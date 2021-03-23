/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
const bcrypt = require('bcrypt');
const SettingsModel = require('../../server/databaseAdapters/mongoDB/models/settings.js');
const UserModel = require('../../server/databaseAdapters/mongoDB/models/user.js');
const UserroleModel = require('../../server/databaseAdapters/mongoDB/models/userrole.js');
const MongoDBAdapter = require('../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const Settings = require('../../server/dataModels/Settings.js');
const User = require('../../server/dataModels/User.js');
const Userrole = require('../../server/dataModels/Userrole.js');

let database;

it('MongoDBAdapter connects to database', async () => {
  database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
  await database.connect();
  expect(database.db).toBeDefined();
  await database.close();
});

it.skip('MongoDBAdapter connects to wrong database and throws error', async () => {
  // ToDo: Rewrite! The test resolves as passed but the error is thrown
  // after the test suite completed.
  database = new MongoDBAdapter('mongodb://testdomain:64017', 'test');
  try {
    await database.connect();
  } catch (e) {
    expect(e).toBe('MongooseServerSelectionError: getaddrinfo ENOTFOUND testdomain');
  }
});

// beforeEach(async () => {
//   await database.clearCollection('errors');
// });

describe('MongoDBAdapter Functions', () => {
  beforeAll(async () => {
    database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  describe('Device functions', () => {
    beforeEach(async () => {
      await database.clearCollection('uvcdevices');
    });

    it('addDevice adds a device correct and returns the object', async () => {
      const device = {
        serialnumber: 'MongoDBAdap1',
        name: 'Test Device 1',
      };

      const addedDevice = await database.addDevice(device);
      expect(addedDevice.serialnumber).toBe(device.serialnumber);
      expect(addedDevice.name).toBe(device.name);
    });

    it.each([
      ['engineState', true],
      ['engineLevel', 1],
      ['eventMode', true],
      ['alarmState', true],
      ['engineState', false],
      ['engineLevel', 2],
      ['eventMode', false],
      ['alarmState', false],
    ])('addDevice adds a device with propertie %s and value %s correct and returns the object', async (prop, value) => {
      const device = {
        serialnumber: 'MongoDBAdap1',
        name: 'Test Device 1',
      };
      device[prop] = value;

      const addedDevice = await database.addDevice(device);
      expect(addedDevice.serialnumber).toBe(device.serialnumber);
      expect(addedDevice.name).toBe(device.name);
      expect(addedDevice[prop]).toBe(value);
    });

    it.each([
      [{ prop: 'engineState', value: true }, { prop: 'engineState', value: false }],
      [{ prop: 'engineLevel', value: 1 }, { prop: 'engineLevel', value: 0 }],
      [{ prop: 'eventMode', value: false }, { prop: 'eventMode', value: true }],
      [{ prop: 'alarmState', value: true }, { prop: 'alarmState', value: true }],
      [{ prop: 'engineState', value: true }, { prop: 'engineState', value: false }],
      [{ prop: 'engineLevel', value: 3 }, { prop: 'engineLevel', value: 2 }],
      [{ prop: 'eventMode', value: true }, { prop: 'eventMode', value: false }],
      [{ prop: 'alarmState', value: false }, { prop: 'alarmState', value: true }],
    ])('addDevice adds two devices with device 1 to have %o and device 2 to have %o correct', async (device1, device2) => {
      const dev1 = {
        serialnumber: 'MongoDBAdap1',
        name: 'Test Device 1',
      };
      dev1[device1.prop] = device1.value;

      const dev2 = {
        serialnumber: 'MongoDBAdap2',
        name: 'Test Device 2',
      };
      dev2[device2.prop] = device2.value;

      await database.addDevice(dev1);
      await database.addDevice(dev2);

      let addedDevice = await database.getDevice(dev1.serialnumber);
      expect(addedDevice.serialnumber).toBe(dev1.serialnumber);
      expect(addedDevice.name).toBe(dev1.name);
      expect(addedDevice[device1.prop]).toBe(device1.value);

      addedDevice = await database.getDevice(dev2.serialnumber);
      expect(addedDevice.serialnumber).toBe(dev2.serialnumber);
      expect(addedDevice.name).toBe(dev2.name);
      expect(addedDevice[device2.prop]).toBe(device2.value);
    });

    it('addDevice throws an error if validation fails', async () => {
      const device = {
        name: 'Test Device 1',
      };

      await database.addDevice(device).catch((e) => {
        expect(e.toString()).toBe('Error: Serialnumber has to be defined.');
      });
    });

    it('getDevice gets a device correct and returns the object', async () => {
      const device = {
        serialnumber: 'MongoDBAdap1',
        name: 'Test Device 1',
      };

      await database.addDevice(device);
      const returnedDevice = await database.getDevice(device.serialnumber);
      expect(returnedDevice.id).toBeDefined();
      expect(returnedDevice.serialnumber).toBe(device.serialnumber);
      expect(returnedDevice.name).toBe(device.name);
      expect(returnedDevice.group).toStrictEqual({});
      expect(returnedDevice.engineState).toBe(false);
      expect(returnedDevice.engineLevel).toBe(0);
      expect(returnedDevice.alarmState).toBe(false);
      expect(returnedDevice.currentFanState).toStrictEqual({ state: '' });
      expect(returnedDevice.currentBodyState).toBeDefined();
      expect(returnedDevice.currentLampState).toBeDefined();
      expect(returnedDevice.currentLampValue).toBeDefined();
      expect(returnedDevice.eventMode).toBe(false);
      expect(returnedDevice.tacho).toStrictEqual({ tacho: 0 });
      expect(returnedDevice.currentAirVolume).toStrictEqual({ volume: 0 });
    });

    it('getDevice throws error if deviceID is not string', async () => {
      await database.getDevice(null).catch((err) => {
        expect(err.toString()).toBe('Error: Serialnumber has to be a string');
      });
    });

    it('getDevice throws error if device is not avalible', async () => {
      await database.getDevice('MongoDBAdapter_Test_3').catch((err) => {
        expect(err.toString()).toBe('Error: Device does not exists');
      });
    });

    it('getDevices gets all devices', async () => {
      await database.addDevice(
        {
          serialnumber: 'MongoDBAdapter_Test_1',
          name: 'Test Device 1',
        },
      );

      await database.addDevice(
        {
          serialnumber: 'MongoDBAdapter_Test_2',
          name: 'Test Device 2',
        },
      );

      await database.addDevice(
        {
          serialnumber: 'MongoDBAdapter_Test_3',
          name: 'Test Device 3',
        },
      );

      const dbData = await database.getDevices().catch((err) => {
        console.error(err);
      });

      for (let i = 0; i < dbData.length; i += 1) {
        expect(dbData[i].id).toBeDefined();
        expect(dbData[i].serialnumber).toBe(`MongoDBAdapter_Test_${i + 1}`);
        expect(dbData[i].name).toBe(`Test Device ${i + 1}`);
        expect(dbData[i].group).toStrictEqual({});
        expect(dbData[i].engineState).toBe(false);
        expect(dbData[i].engineLevel).toBe(0);
        expect(dbData[i].alarmState).toBe(false);
        expect(dbData[i].currentFanState).toStrictEqual({ state: '' });
        expect(dbData[i].currentBodyState).toBeDefined();
        expect(dbData[i].currentLampState).toBeDefined();
        expect(dbData[i].currentLampValue).toBeDefined();
        expect(dbData[i].eventMode).toBe(false);
        expect(dbData[i].tacho).toStrictEqual({ tacho: 0 });
        expect(dbData[i].currentAirVolume).toStrictEqual({ volume: 0 });
      }
    });

    it('updateDevice updates a device correct and returns the object', async () => {
      const device = {
        serialnumber: '000000000000000001111111',
        name: 'Test Device 2',
      };

      await database.addDevice(
        {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        },
      );
      const updatedDevice = await database.updateDevice(device);
      expect(updatedDevice.serialnumber).toBe(device.serialnumber);
      expect(updatedDevice.name).toBe(device.name);
    });

    it('updateDevice throws error if device is not available', async () => {
      const device = {
        serialnumber: '000000000000000001111111',
        name: 'Test Device 2',
      };

      await database.updateDevice(device).catch((err) => {
        expect(err.toString()).toBe('Error: Device does not exists');
      });
    });

    it('updateDevice throws an error if validation fails', async () => {
      const device = {
        name: 'Test Device 1',
      };

      await database.updateDevice(device).catch((e) => {
        expect(e.toString()).toBe('Error: Serialnumber has to be defined.');
      });
    });

    it('deleteDevice deletes a device', async () => {
      const device = {
        serialnumber: '000000000000000001111111',
        name: 'Test Device 1',
      };

      await database.addDevice(device);
      await database.deleteDevice(device.serialnumber);
      await database.getDevice(device.serialnumber).catch((err) => {
        expect(err.toString()).toBe('Error: Device does not exists');
      });
    });

    it('deleteDevice deletes a device and is removed from the group', async () => {
      const device = {
        serialnumber: '000000000000000001111111',
        name: 'Test Device 1',
      };
      await database.addDevice(device);

      const group = {
        name: 'Group',
      };
      const docGroup = await database.addGroup(group);
      await database.addDeviceToGroup(device.serialnumber, `${docGroup._id}`);

      await database.deleteDevice(device.serialnumber);
      const newDocGroup = await database.getGroup(`${docGroup._id}`);
      expect(newDocGroup.devices.length).toBe(0);
    });

    it('deleteDevice throws error if device is not available', async () => {
      const device = {
        serialnumber: 'MongoDBAdapter_Test_7',
        name: 'Test Device 1',
      };
      await database.deleteDevice(device.serialnumber).catch((err) => {
        expect(err.toString()).toBe('Error: Device does not exists');
      });
    });

    describe('Serialnumber functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
      });

      it('getSerialnumbers returns all Serialnumbers', async () => {
        for (let i = 0; i < 100; i += 1) {
          await database.addDevice({
            name: `${i}`,
            serialnumber: `${i}`,
          });
        }

        const serialnumbers = await database.getSerialnumbers();
        expect(serialnumbers.length).toBe(100);
        for (let i = 0; i < 100; i += 1) {
          expect(serialnumbers[i]).toBe(`${i}`);
        }
      });

      it('getSerialnumbers returns empty array if no devices exists', async () => {
        const serialnumbers = await database.getSerialnumbers();
        expect(serialnumbers.length).toBe(0);
        expect(serialnumbers).toStrictEqual([]);
      });
    });

    describe('AirVolume functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('airvolumes');
      });

      it('addAirVolume adds a AirVolume Document correct and returns the object', async () => {
        const airVolume = {
          device: '000000000000000000000001',
          volume: 10,
        };

        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedAirVolume = await database.addAirVolume(airVolume);
        expect(addedAirVolume.device).toBe(airVolume.device);
        expect(addedAirVolume.volume).toBe(airVolume.volume);

        const d = await database.getDevice(device.serialnumber);
        expect(d.currentAirVolume._id).toStrictEqual(addedAirVolume._id);
        expect(d.currentAirVolume.volume).toStrictEqual(addedAirVolume.volume);
      });

      it('addAirVolume throws an error if validation fails', async () => {
        const airVolume = {
          volume: 20,
        };

        await database.addAirVolume(airVolume).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('addAirVolume throws an error if device does not exists', async () => {
        const airVolume = {
          device: 'TestDevice',
          volume: 50,
        };

        await database.addAirVolume(airVolume).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('getAirVolumes gets all AirVolumes of one device', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const volumes = [];
        for (let i = 0; i < 10; i += 1) {
          volumes.push({
            device: '1',
            volume: 10 * i,
          });
        }

        await Promise.all(
          volumes.map(async (v) => {
            await database.addAirVolume(v);
          }),
        );

        const airVolumes = await database.getAirVolume('1');

        expect(volumes.length).toBe(airVolumes.length);

        for (let i = 0; i < volumes.length; i += 1) {
          expect(airVolumes[i].device).toBe('1');
          expect(airVolumes[i].volume).toBe(volumes[i].volume);
        }
      });

      it('getAirVolumes gets all AirVolumes of one device after a specific date', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const volumes = [];
        for (let i = 0; i < 10; i += 1) {
          volumes.push({
            device: '1',
            volume: 10 * i,
            date: new Date((i + 1) * 100000),
          });
        }

        await Promise.all(
          volumes.map(async (v) => {
            await database.addAirVolume(v);
          }),
        );

        const airVolumes = await database.getAirVolume('1', new Date((3) * 100000));

        expect(volumes.length - 2).toBe(airVolumes.length);

        for (let i = 2; i < volumes.length; i += 1) {
          expect(airVolumes[i - 2].device).toBe('1');
          expect(airVolumes[i - 2].volume).toBe(volumes[i].volume);
        }
      });

      it('getAirVolumes gets all AirVolumes of one device in a specific time range', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const volumes = [];
        for (let i = 0; i < 10; i += 1) {
          volumes.push({
            device: '1',
            volume: 10 * i,
            date: new Date((i + 1) * 100000),
          });
        }

        await Promise.all(
          volumes.map(async (v) => {
            await database.addAirVolume(v);
          }),
        );

        const airVolumes = await database.getAirVolume('1', new Date((3) * 100000), new Date((8) * 100000));

        expect(volumes.length - 4).toBe(airVolumes.length);

        for (let i = 2; i < airVolumes.length; i += 1) {
          expect(airVolumes[i - 2].device).toBe('1');
          expect(airVolumes[i - 2].volume).toBe(volumes[i].volume);
        }
      });

      it('getAirVolumes gets all AirVolumes of one device before a specific date', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const volumes = [];
        for (let i = 0; i < 10; i += 1) {
          volumes.push({
            device: '1',
            volume: 10 * i,
            date: new Date((i + 1) * 100000),
          });
        }

        await Promise.all(
          volumes.map(async (v) => {
            await database.addAirVolume(v);
          }),
        );

        const airVolumes = await database.getAirVolume('1', undefined, new Date((8) * 100000));

        expect(volumes.length - 2).toBe(airVolumes.length);

        for (let i = 0; i < airVolumes.length; i += 1) {
          expect(airVolumes[i].device).toBe('1');
          expect(airVolumes[i].volume).toBe(volumes[i].volume);
        }
      });
    });

    describe('LampState functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('alarmstates');
      });

      it('setLampState adds a LampState Document correct and returns the object', async () => {
        const alarmState = {
          device: '000000000000000000000001',
          lamp: 1,
          state: 'OK',
        };

        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedLampState = await database.setLampState(alarmState);
        expect(addedLampState.device).toBe(alarmState.device);
        expect(addedLampState.lamp).toBe(alarmState.lamp);
        expect(addedLampState.state).toBe(alarmState.state);

        const d = await database.getDevice(device.serialnumber);
        expect(d.currentLampState[alarmState.lamp - 1]._id).toStrictEqual(addedLampState._id);
      });

      it('setLampState throws an error if the validation fails', async () => {
        const alarmState = {
          lamp: 1,
          state: 'OK',
        };
        await database.setLampState(alarmState).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('setLampState throws an error if the device does not exists', async () => {
        const alarmState = {
          device: '000000000000000000000001',
          lamp: 1,
          state: 'OK',
        };

        await database.setLampState(alarmState).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('setLampState changes the LampState of a device proberly', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const alarms = [];
        for (let i = 1; i <= 10; i += 1) {
          alarms.push({
            device: '000000000000000000000001',
            lamp: i,
            state: (i % 2 === 1) ? 'OK' : 'Alarm',
          });
        }

        await Promise.all(
          alarms.map(async (a) => {
            await database.setLampState(a);
          }),
        );

        await database.getLampState(device.serialnumber);
        const databaseDevice = await database.getDevice(device.serialnumber);

        for (let i = 1; i <= databaseDevice.currentLampState.length; i += 1) {
          const alarmState = databaseDevice.currentLampState[i - 1];
          expect(alarmState.lamp).toBe(i);
          expect(alarmState.state).toBe(alarms[i - 1].state);
        }
      });

      it('getLampState gets all LampStates of one device', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const alarms = [];
        for (let i = 1; i <= 10; i += 1) {
          alarms.push({
            device: '000000000000000000000001',
            lamp: i,
            state: (i % 2 === 1) ? 'OK' : 'Alarm',
          });
        }

        await Promise.all(
          alarms.map(async (a) => {
            await database.setLampState(a);
          }),
        );

        const alarmStates = await database.getLampState('000000000000000000000001');

        expect(alarms.length).toBe(alarmStates.length);

        for (let i = 0; i < alarms.length; i += 1) {
          expect(alarmStates[i].device).toBe('000000000000000000000001');
          expect(alarmStates[i].lamp).toBe(alarms[i].lamp);
          expect(alarmStates[i].state).toBe(alarms[i].state);
        }
      });
    });

    describe('LampValue functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('lampvalues');
      });

      it('addLampValue adds a LampValue Document correct and returns the object', async () => {
        const lampValue = {
          device: '000000000000000000000001',
          lamp: 1,
          value: 100,
        };

        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedLampValue = await database.addLampValue(lampValue);
        expect(addedLampValue.device).toBe(lampValue.device);
        expect(addedLampValue.lamp).toBe(lampValue.lamp);
        expect(addedLampValue.state).toBe(lampValue.state);

        const d = await database.getDevice(device.serialnumber);
        expect(d.currentLampValue[lampValue.lamp - 1]._id).toStrictEqual(addedLampValue._id);
      });

      it('addLampValue throws an error if the validation fails', async () => {
        const lampValue = {
          lamp: 1,
          value: 100,
        };
        await database.addLampValue(lampValue).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('addLampValue throws an error if the device does not exists', async () => {
        const lampValue = {
          device: '000000000000000000000001',
          lamp: 1,
          value: 100,
        };

        await database.addLampValue(lampValue).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('addLampValue changes the LampValue of a device proberly', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const lampValues = [];
        for (let i = 1; i <= 10; i += 1) {
          lampValues.push({
            device: '000000000000000000000001',
            lamp: i,
            value: i * 10,
          });
        }

        await Promise.all(
          lampValues.map(async (a) => {
            await database.addLampValue(a);
          }),
        );

        const databaseDevice = await database.getDevice(device.serialnumber);

        for (let i = 1; i <= databaseDevice.currentLampValue.length; i += 1) {
          const lampValue = databaseDevice.currentLampValue[i - 1];
          expect(lampValue.lamp).toBe(i);
          expect(lampValue.value).toBe(lampValues[i - 1].value);
        }
      });

      it('getLampValues gets all LampValues of one device', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const values = [];
        for (let i = 1; i <= 10; i += 1) {
          values.push({
            device: '000000000000000001111111',
            lamp: i,
            value: i * 10,
          });
        }

        await Promise.all(
          values.map(async (a) => {
            await database.addLampValue(a);
          }),
        );

        const lampValues = await database.getLampValues('000000000000000001111111');

        expect(values.length).toBe(lampValues.length);

        for (let i = 0; i < values.length; i += 1) {
          expect(lampValues[i].device).toBe('000000000000000001111111');
          expect(lampValues[i].lamp).toBe(values[i].lamp);
          expect(lampValues[i].value).toBe(values[i].value);
        }
      });

      it('getLampValues gets all LampValues of one device and one lamp', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const values = [];
        for (let i = 1; i <= 10; i += 1) {
          values.push({
            device: '000000000000000001111111',
            lamp: i + (i % 2),
            value: i * 10,
          });
        }

        await Promise.all(
          values.map(async (a) => {
            await database.addLampValue(a);
          }),
        );

        const lampValues = [];

        for (let i = 0; i < 5; i += 1) {
          lampValues[i] = await database.getLampValues('000000000000000001111111', `${(i + 1) * 2}`);
        }

        expect(lampValues.length).toBe(5);

        for (let i = 0; i < lampValues.length; i += 1) {
          const lampValuesAtLamp = lampValues[i];
          expect(lampValuesAtLamp.length).toBe(2);
          for (let j = 0; j < lampValuesAtLamp.length; j += 1) {
            const element = lampValuesAtLamp[j];
            expect(element.device).toBe('000000000000000001111111');
            expect(element.lamp).toBe((i + 1) * 2);
            expect(element.value).toBe((i * 2 + j + 1) * 10);
          }
        }
      });

      it('getLampValues gets all LampValues of one device after a specific date', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const values = [];
        for (let i = 1; i <= 10; i += 1) {
          values.push({
            device: '000000000000000001111111',
            lamp: i,
            value: i * 10,
            date: new Date((i) * 10000),
          });
        }

        await Promise.all(
          values.map(async (a) => {
            await database.addLampValue(a);
          }),
        );

        const lampValues = await database.getLampValues('000000000000000001111111', undefined, new Date(3 * 10000));

        expect(lampValues.length).toBe(values.length - 2);

        for (let i = 0; i < lampValues.length; i += 1) {
          expect(lampValues[i].device).toBe('000000000000000001111111');
          expect(lampValues[i].lamp).toBe(values[i + 2].lamp);
          expect(lampValues[i].value).toBe(values[i + 2].value);
        }
      });

      it('getLampValues gets all LampValues of one device before a specific date', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const values = [];
        for (let i = 1; i <= 10; i += 1) {
          values.push({
            device: '000000000000000001111111',
            lamp: i,
            value: i * 10,
            date: new Date((i) * 10000),
          });
        }

        await Promise.all(
          values.map(async (a) => {
            await database.addLampValue(a);
          }),
        );

        const lampValues = await database.getLampValues('000000000000000001111111', undefined, undefined, new Date(7 * 10000));

        expect(lampValues.length).toBe(values.length - 3);

        for (let i = 0; i < lampValues.length; i += 1) {
          expect(lampValues[i].device).toBe('000000000000000001111111');
          expect(lampValues[i].lamp).toBe(values[i].lamp);
          expect(lampValues[i].value).toBe(values[i].value);
        }
      });

      it('getLampValues gets all LampValues of one device in a specific time range', async () => {
        const device = {
          serialnumber: '000000000000000000000001',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const values = [];
        for (let i = 1; i <= 10; i += 1) {
          values.push({
            device: '000000000000000001111111',
            lamp: i,
            value: i * 10,
            date: new Date((i) * 10000),
          });
        }

        await Promise.all(
          values.map(async (a) => {
            await database.addLampValue(a);
          }),
        );

        const lampValues = await database.getLampValues('000000000000000001111111', undefined, new Date(3 * 10000), new Date(7 * 10000));

        expect(lampValues.length).toBe(values.length - 5);

        for (let i = 0; i < lampValues.length; i += 1) {
          expect(lampValues[i].device).toBe('000000000000000001111111');
          expect(lampValues[i].lamp).toBe(values[i + 2].lamp);
          expect(lampValues[i].value).toBe(values[i + 2].value);
        }
      });
    });

    describe('Tacho functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('tachos');
      });

      it('addTacho adds a Tacho Document correct and returns the object', async () => {
        const tacho = {
          device: '000000000000000001111111',
          tacho: 1,
        };

        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedTacho = await database.addTacho(tacho);
        expect(addedTacho.device).toBe(tacho.device);
        expect(addedTacho.tacho).toBe(tacho.tacho);

        const d = await database.getDevice(tacho.device);
        expect(d.tacho._id).toStrictEqual(addedTacho._id);
        expect(d.tacho.tacho).toStrictEqual(addedTacho.tacho);
      });

      it('addTacho throws an error if the validation fails', async () => {
        const tacho = {
          tacho: 1,
        };

        await database.addTacho(tacho).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('setLampState throws an error if the device does not exists', async () => {
        const tacho = {
          device: '000000000000000001111111',
          tacho: 1,
        };

        await database.addTacho(tacho).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('getTachos gets all Tacho of one device', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const tachos = [];
        for (let i = 1; i <= 10; i += 1) {
          tachos.push({
            device: '000000000000000001111111',
            tacho: i * 10,
          });
        }

        await Promise.all(
          tachos.map(async (a) => {
            await database.addTacho(a);
          }),
        );

        const docTachos = await database.getTachos('000000000000000001111111');

        expect(docTachos.length).toBe(tachos.length);

        for (let i = 0; i < docTachos.length; i += 1) {
          expect(docTachos[i].device).toBe('000000000000000001111111');
          expect(docTachos[i].tacho).toBe(tachos[i].tacho);
        }
      });

      it('getTachos gets all Tacho of one device before a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const tachos = [];
        for (let i = 1; i <= 10; i += 1) {
          tachos.push({
            device: '000000000000000001111111',
            tacho: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          tachos.map(async (a) => {
            await database.addTacho(a);
          }),
        );

        const docTachos = await database.getTachos('000000000000000001111111', new Date(3 * 10000));

        expect(docTachos.length).toBe(tachos.length - 2);

        for (let i = 0; i < docTachos.length; i += 1) {
          expect(docTachos[i].device).toBe('000000000000000001111111');
          expect(docTachos[i].tacho).toBe(tachos[i + 2].tacho);
        }
      });

      it('getTachos gets all Tacho of one device after a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const tachos = [];
        for (let i = 1; i <= 10; i += 1) {
          tachos.push({
            device: '000000000000000001111111',
            tacho: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          tachos.map(async (a) => {
            await database.addTacho(a);
          }),
        );

        const docTachos = await database.getTachos('000000000000000001111111', undefined, new Date(7 * 10000));

        expect(docTachos.length).toBe(tachos.length - 3);

        for (let i = 0; i < docTachos.length; i += 1) {
          expect(docTachos[i].device).toBe('000000000000000001111111');
          expect(docTachos[i].tacho).toBe(tachos[i].tacho);
        }
      });

      it('getTachos gets all Tacho of one device in a specific time range', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const tachos = [];
        for (let i = 1; i <= 10; i += 1) {
          tachos.push({
            device: '000000000000000001111111',
            tacho: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          tachos.map(async (a) => {
            await database.addTacho(a);
          }),
        );

        const docTachos = await database.getTachos('000000000000000001111111', new Date(3 * 10000), new Date(7 * 10000));

        expect(docTachos.length).toBe(tachos.length - 5);

        for (let i = 0; i < docTachos.length; i += 1) {
          expect(docTachos[i].device).toBe('000000000000000001111111');
          expect(docTachos[i].tacho).toBe(tachos[i + 2].tacho);
        }
      });
    });

    describe('FanState functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('fanstates');
      });

      it('addFanState adds a FanState Document correct and returns the object', async () => {
        const fanState = {
          device: '000000000000000001111111',
          state: '1',
        };

        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedFanState = await database.addFanState(fanState);
        expect(addedFanState.device).toBe(fanState.device);
        expect(addedFanState.state).toBe(fanState.state);

        const d = await database.getDevice(fanState.device);
        expect(d.currentFanState.state).toStrictEqual(addedFanState.state);
      });

      it('addFanState throws an error if the validation fails', async () => {
        const fanState = {
          state: '1',
        };

        await database.addFanState(fanState).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('addFanState throws an error if the device does not exists', async () => {
        const fanState = {
          device: '000000000000000001111111',
          state: '1',
        };

        await database.addFanState(fanState).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('getFanStates gets all FanState of one device', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const fanStates = [];
        for (let i = 1; i <= 10; i += 1) {
          fanStates.push({
            device: '000000000000000001111111',
            state: `${i * 10}`,
          });
        }

        await Promise.all(
          fanStates.map(async (a) => {
            await database.addFanState(a);
          }),
        );

        const docFanStates = await database.getFanStates('000000000000000001111111');

        expect(docFanStates.length).toBe(fanStates.length);

        for (let i = 0; i < docFanStates.length; i += 1) {
          expect(docFanStates[i].device).toBe('000000000000000001111111');
          expect(docFanStates[i].state).toBe(fanStates[i].state);
        }
      });

      it('getFanStates gets all FanState of one device before a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const fanStates = [];
        for (let i = 1; i <= 10; i += 1) {
          fanStates.push({
            device: '000000000000000001111111',
            state: `${i * 10}`,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          fanStates.map(async (a) => {
            await database.addFanState(a);
          }),
        );

        const docFanStates = await database.getFanStates('000000000000000001111111', new Date(3 * 10000));

        expect(docFanStates.length).toBe(fanStates.length - 2);

        for (let i = 0; i < docFanStates.length; i += 1) {
          expect(docFanStates[i].device).toBe('000000000000000001111111');
          expect(docFanStates[i].state).toBe(fanStates[i + 2].state);
        }
      });

      it('getFanStates gets all FanState of one device after a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const fanStates = [];
        for (let i = 1; i <= 10; i += 1) {
          fanStates.push({
            device: '000000000000000001111111',
            state: `${i * 10}`,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          fanStates.map(async (a) => {
            await database.addFanState(a);
          }),
        );

        const docFanStates = await database.getFanStates('000000000000000001111111', undefined, new Date(7 * 10000));

        expect(docFanStates.length).toBe(fanStates.length - 3);

        for (let i = 0; i < docFanStates.length; i += 1) {
          expect(docFanStates[i].device).toBe('000000000000000001111111');
          expect(docFanStates[i].state).toBe(fanStates[i].state);
        }
      });

      it('getFanStates gets all FanState of one device in a specific time range', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const fanStates = [];
        for (let i = 1; i <= 10; i += 1) {
          fanStates.push({
            device: '000000000000000001111111',
            state: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          fanStates.map(async (a) => {
            await database.addFanState(a);
          }),
        );

        const docFanStates = await database.getFanStates('000000000000000001111111', new Date(3 * 10000), new Date(7 * 10000));

        expect(docFanStates.length).toBe(fanStates.length - 5);

        for (let i = 0; i < docFanStates.length; i += 1) {
          expect(docFanStates[i].device).toBe('000000000000000001111111');
          expect(docFanStates[i].fanState).toBe(fanStates[i + 2].fanState);
        }
      });
    });

    describe('BodyState functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('bodystates');
      });

      it('addBodyState adds a BodyState Document correct and returns the object', async () => {
        const bodyState = {
          device: '000000000000000001111111',
          state: '1',
        };

        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedBodyState = await database.addBodyState(bodyState);
        expect(addedBodyState.device).toBe(bodyState.device);
        expect(addedBodyState.state).toBe(bodyState.state);

        const d = await database.getDevice(bodyState.device);
        expect(d.currentBodyState.state).toStrictEqual(addedBodyState.state);
      });

      it('addBodyState throws an error if the validation fails', async () => {
        const bodyState = {
          state: '1',
        };

        await database.addBodyState(bodyState).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('addBodyState throws an error if the device does not exists', async () => {
        const bodyState = {
          device: '000000000000000001111111',
          state: '1',
        };

        await database.addBodyState(bodyState).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('getBodyStates gets all BodyState of one device', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const bodyStates = [];
        for (let i = 1; i <= 10; i += 1) {
          bodyStates.push({
            device: '000000000000000001111111',
            state: `${i * 10}`,
          });
        }

        await Promise.all(
          bodyStates.map(async (a) => {
            await database.addBodyState(a);
          }),
        );

        const docBodyStates = await database.getBodyStates('000000000000000001111111');

        expect(docBodyStates.length).toBe(bodyStates.length);

        for (let i = 0; i < docBodyStates.length; i += 1) {
          expect(docBodyStates[i].device).toBe('000000000000000001111111');
          expect(docBodyStates[i].state).toBe(bodyStates[i].state);
        }
      });

      it('getBodyStates gets all BodyState of one device before a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const bodyStates = [];
        for (let i = 1; i <= 10; i += 1) {
          bodyStates.push({
            device: '000000000000000001111111',
            state: `${i * 10}`,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          bodyStates.map(async (a) => {
            await database.addBodyState(a);
          }),
        );

        const docBodyStates = await database.getBodyStates('000000000000000001111111', new Date(3 * 10000));

        expect(docBodyStates.length).toBe(bodyStates.length - 2);

        for (let i = 0; i < docBodyStates.length; i += 1) {
          expect(docBodyStates[i].device).toBe('000000000000000001111111');
          expect(docBodyStates[i].state).toBe(bodyStates[i + 2].state);
        }
      });

      it('getBodyStates gets all BodyState of one device after a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const bodyStates = [];
        for (let i = 1; i <= 10; i += 1) {
          bodyStates.push({
            device: '000000000000000001111111',
            state: `${i * 10}`,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          bodyStates.map(async (a) => {
            await database.addBodyState(a);
          }),
        );

        const docBodyStates = await database.getBodyStates('000000000000000001111111', undefined, new Date(7 * 10000));

        expect(docBodyStates.length).toBe(bodyStates.length - 3);

        for (let i = 0; i < docBodyStates.length; i += 1) {
          expect(docBodyStates[i].device).toBe('000000000000000001111111');
          expect(docBodyStates[i].state).toBe(bodyStates[i].state);
        }
      });

      it('getBodyStates gets all BodyState of one device in a specific time range', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const bodyStates = [];
        for (let i = 1; i <= 10; i += 1) {
          bodyStates.push({
            device: '000000000000000001111111',
            state: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          bodyStates.map(async (a) => {
            await database.addBodyState(a);
          }),
        );

        const docBodyStates = await database.getBodyStates('000000000000000001111111', new Date(3 * 10000), new Date(7 * 10000));

        expect(docBodyStates.length).toBe(bodyStates.length - 5);

        for (let i = 0; i < docBodyStates.length; i += 1) {
          expect(docBodyStates[i].device).toBe('000000000000000001111111');
          expect(docBodyStates[i].bodyState).toBe(bodyStates[i + 2].bodyState);
        }
      });
    });

    describe('FanVoltage functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('fanvoltages');
      });

      it('addFanVoltage adds a FanVoltage Document correct and returns the object', async () => {
        const fanVoltage = {
          device: '000000000000000001111111',
          voltage: 1,
        };

        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedFanVoltage = await database.addFanVoltage(fanVoltage);
        expect(addedFanVoltage.device).toBe(fanVoltage.device);
        expect(addedFanVoltage.voltage).toBe(fanVoltage.voltage);

        const d = await database.getDevice(fanVoltage.device);
        expect(d.currentFanVoltage.voltage).toStrictEqual(addedFanVoltage.voltage);
      });

      it('addFanVoltage throws an error if the validation fails', async () => {
        const fanVoltage = {
          voltage: 1,
        };

        await database.addFanVoltage(fanVoltage).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('addFanVoltage throws an error if the device does not exists', async () => {
        const fanVoltage = {
          device: '000000000000000001111111',
          voltage: 1,
        };

        await database.addFanVoltage(fanVoltage).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('getFanVoltages gets all FanVoltage of one device', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const fanVoltages = [];
        for (let i = 1; i <= 10; i += 1) {
          fanVoltages.push({
            device: '000000000000000001111111',
            voltage: i * 10,
          });
        }

        await Promise.all(
          fanVoltages.map(async (a) => {
            await database.addFanVoltage(a);
          }),
        );

        const docFanVoltages = await database.getFanVoltages('000000000000000001111111');

        expect(docFanVoltages.length).toBe(fanVoltages.length);

        for (let i = 0; i < docFanVoltages.length; i += 1) {
          expect(docFanVoltages[i].device).toBe('000000000000000001111111');
          expect(docFanVoltages[i].voltage).toBe(fanVoltages[i].voltage);
        }
      });

      it('getFanVoltages gets all FanVoltage of one device before a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const fanVoltages = [];
        for (let i = 1; i <= 10; i += 1) {
          fanVoltages.push({
            device: '000000000000000001111111',
            voltage: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          fanVoltages.map(async (a) => {
            await database.addFanVoltage(a);
          }),
        );

        const docFanVoltages = await database.getFanVoltages('000000000000000001111111', new Date(3 * 10000));

        expect(docFanVoltages.length).toBe(fanVoltages.length - 2);

        for (let i = 0; i < docFanVoltages.length; i += 1) {
          expect(docFanVoltages[i].device).toBe('000000000000000001111111');
          expect(docFanVoltages[i].voltage).toBe(fanVoltages[i + 2].voltage);
        }
      });

      it('getFanVoltages gets all FanVoltage of one device after a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const fanVoltages = [];
        for (let i = 1; i <= 10; i += 1) {
          fanVoltages.push({
            device: '000000000000000001111111',
            voltage: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          fanVoltages.map(async (a) => {
            await database.addFanVoltage(a);
          }),
        );

        const docFanVoltages = await database.getFanVoltages('000000000000000001111111', undefined, new Date(7 * 10000));

        expect(docFanVoltages.length).toBe(fanVoltages.length - 3);

        for (let i = 0; i < docFanVoltages.length; i += 1) {
          expect(docFanVoltages[i].device).toBe('000000000000000001111111');
          expect(docFanVoltages[i].voltage).toBe(fanVoltages[i].voltage);
        }
      });

      it('getFanVoltages gets all FanVoltage of one device in a specific time range', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const fanVoltages = [];
        for (let i = 1; i <= 10; i += 1) {
          fanVoltages.push({
            device: '000000000000000001111111',
            voltage: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          fanVoltages.map(async (a) => {
            await database.addFanVoltage(a);
          }),
        );

        const docFanVoltages = await database.getFanVoltages('000000000000000001111111', new Date(3 * 10000), new Date(7 * 10000));

        expect(docFanVoltages.length).toBe(fanVoltages.length - 5);

        for (let i = 0; i < docFanVoltages.length; i += 1) {
          expect(docFanVoltages[i].device).toBe('000000000000000001111111');
          expect(docFanVoltages[i].fanVoltage).toBe(fanVoltages[i + 2].fanVoltage);
        }
      });
    });

    describe('CO2 functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('co2');
      });

      it('addCO2 adds a CO2 Document correct and returns the object', async () => {
        const CO2 = {
          device: '000000000000000001111111',
          co2: 1,
        };

        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedCO2 = await database.addCO2(CO2);
        expect(addedCO2.device).toBe(CO2.device);
        expect(addedCO2.co2).toBe(CO2.co2);

        const d = await database.getDevice(CO2.device);
        expect(d.currentCO2.co2).toStrictEqual(addedCO2.co2);
      });

      it('addCO2 throws an error if the validation fails', async () => {
        const CO2 = {
          co2: 1,
        };

        await database.addCO2(CO2).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('addCO2 throws an error if the device does not exists', async () => {
        const CO2 = {
          device: '000000000000000001111111',
          co2: 1,
        };

        await database.addCO2(CO2).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('getCO2s gets all CO2 of one device', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const CO2s = [];
        for (let i = 1; i <= 10; i += 1) {
          CO2s.push({
            device: '000000000000000001111111',
            co2: i * 10,
          });
        }

        await Promise.all(
          CO2s.map(async (a) => {
            await database.addCO2(a);
          }),
        );

        const docCO2s = await database.getCO2s('000000000000000001111111');

        expect(docCO2s.length).toBe(CO2s.length);

        for (let i = 0; i < docCO2s.length; i += 1) {
          expect(docCO2s[i].device).toBe('000000000000000001111111');
          expect(docCO2s[i].co2).toBe(CO2s[i].co2);
        }
      });

      it('getCO2s gets all CO2 of one device before a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const CO2s = [];
        for (let i = 1; i <= 10; i += 1) {
          CO2s.push({
            device: '000000000000000001111111',
            co2: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          CO2s.map(async (a) => {
            await database.addCO2(a);
          }),
        );

        const docCO2s = await database.getCO2s('000000000000000001111111', new Date(3 * 10000));

        expect(docCO2s.length).toBe(CO2s.length - 2);

        for (let i = 0; i < docCO2s.length; i += 1) {
          expect(docCO2s[i].device).toBe('000000000000000001111111');
          expect(docCO2s[i].co2).toBe(CO2s[i + 2].co2);
        }
      });

      it('getCO2s gets all CO2 of one device after a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const CO2s = [];
        for (let i = 1; i <= 10; i += 1) {
          CO2s.push({
            device: '000000000000000001111111',
            co2: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          CO2s.map(async (a) => {
            await database.addCO2(a);
          }),
        );

        const docCO2s = await database.getCO2s('000000000000000001111111', undefined, new Date(7 * 10000));

        expect(docCO2s.length).toBe(CO2s.length - 3);

        for (let i = 0; i < docCO2s.length; i += 1) {
          expect(docCO2s[i].device).toBe('000000000000000001111111');
          expect(docCO2s[i].co2).toBe(CO2s[i].co2);
        }
      });

      it('getCO2s gets all CO2 of one device in a specific time range', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const CO2s = [];
        for (let i = 1; i <= 10; i += 1) {
          CO2s.push({
            device: '000000000000000001111111',
            co2: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          CO2s.map(async (a) => {
            await database.addCO2(a);
          }),
        );

        const docCO2s = await database.getCO2s('000000000000000001111111', new Date(3 * 10000), new Date(7 * 10000));

        expect(docCO2s.length).toBe(CO2s.length - 5);

        for (let i = 0; i < docCO2s.length; i += 1) {
          expect(docCO2s[i].device).toBe('000000000000000001111111');
          expect(docCO2s[i].co2).toBe(CO2s[i + 2].co2);
        }
      });
    });

    describe('TVOC functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
        await database.clearCollection('tvocs');
      });

      it('addTVOC adds a TVOC Document correct and returns the object', async () => {
        const TVOC = {
          device: '000000000000000001111111',
          tvoc: 1,
        };

        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const addedTVOC = await database.addTVOC(TVOC);
        expect(addedTVOC.device).toBe(TVOC.device);
        expect(addedTVOC.tvoc).toBe(TVOC.tvoc);

        const d = await database.getDevice(TVOC.device);
        expect(d.currentTVOC.tvoc).toStrictEqual(addedTVOC.tvoc);
      });

      it('addTVOC throws an error if the validation fails', async () => {
        const TVOC = {
          tvoc: 1,
        };

        await database.addTVOC(TVOC).catch((e) => {
          expect(e.toString()).toBe('ValidationError: device: Path `device` is required.');
        });
      });

      it('addTVOC throws an error if the device does not exists', async () => {
        const TVOC = {
          device: '000000000000000001111111',
          tvoc: 1,
        };

        await database.addTVOC(TVOC).catch((e) => {
          expect(e.toString()).toBe('Error: Device does not exists');
        });
      });

      it('getTVOCs gets all TVOC of one device', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const TVOCs = [];
        for (let i = 1; i <= 10; i += 1) {
          TVOCs.push({
            device: '000000000000000001111111',
            tvoc: i * 10,
          });
        }

        await Promise.all(
          TVOCs.map(async (a) => {
            await database.addTVOC(a);
          }),
        );

        const docTVOCs = await database.getTVOCs('000000000000000001111111');

        expect(docTVOCs.length).toBe(TVOCs.length);

        for (let i = 0; i < docTVOCs.length; i += 1) {
          expect(docTVOCs[i].device).toBe('000000000000000001111111');
          expect(docTVOCs[i].tvoc).toBe(TVOCs[i].tvoc);
        }
      });

      it('getTVOCs gets all TVOC of one device before a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const TVOCs = [];
        for (let i = 1; i <= 10; i += 1) {
          TVOCs.push({
            device: '000000000000000001111111',
            tvoc: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          TVOCs.map(async (a) => {
            await database.addTVOC(a);
          }),
        );

        const docTVOCs = await database.getTVOCs('000000000000000001111111', new Date(3 * 10000));

        expect(docTVOCs.length).toBe(TVOCs.length - 2);

        for (let i = 0; i < docTVOCs.length; i += 1) {
          expect(docTVOCs[i].device).toBe('000000000000000001111111');
          expect(docTVOCs[i].tvoc).toBe(TVOCs[i + 2].tvoc);
        }
      });

      it('getTVOCs gets all TVOC of one device after a specific date', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const TVOCs = [];
        for (let i = 1; i <= 10; i += 1) {
          TVOCs.push({
            device: '000000000000000001111111',
            tvoc: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          TVOCs.map(async (a) => {
            await database.addTVOC(a);
          }),
        );

        const docTVOCs = await database.getTVOCs('000000000000000001111111', undefined, new Date(7 * 10000));

        expect(docTVOCs.length).toBe(TVOCs.length - 3);

        for (let i = 0; i < docTVOCs.length; i += 1) {
          expect(docTVOCs[i].device).toBe('000000000000000001111111');
          expect(docTVOCs[i].tvoc).toBe(TVOCs[i].tvoc);
        }
      });

      it('getTVOCs gets all TVOC of one device in a specific time range', async () => {
        const device = {
          serialnumber: '000000000000000001111111',
          name: 'Test Device 1',
        };

        await database.addDevice(device);

        const TVOCs = [];
        for (let i = 1; i <= 10; i += 1) {
          TVOCs.push({
            device: '000000000000000001111111',
            tvoc: i * 10,
            date: new Date(i * 10000),
          });
        }

        await Promise.all(
          TVOCs.map(async (a) => {
            await database.addTVOC(a);
          }),
        );

        const docTVOCs = await database.getTVOCs('000000000000000001111111', new Date(3 * 10000), new Date(7 * 10000));

        expect(docTVOCs.length).toBe(TVOCs.length - 5);

        for (let i = 0; i < docTVOCs.length; i += 1) {
          expect(docTVOCs[i].device).toBe('000000000000000001111111');
          expect(docTVOCs[i].tvoc).toBe(TVOCs[i + 2].tvoc);
        }
      });
    });

    describe('Device Alarm functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcdevices');
      });

      it('setDeviceAlarm sets the device alarm correct', async () => {
        const device = {
          name: 'Test Device',
          serialnumber: '000000000000000000000001',
        };
        await database.addDevice(device);

        await database.setDeviceAlarm(device.serialnumber, true);
        const dev = await database.getDevice(device.serialnumber);
        expect(dev.alarmState).toBe(true);
      });

      it('setDeviceAlarm sets the device alarm and group alarm correct', async () => {
        const device = {
          name: 'Test Device',
          serialnumber: '000000000000000000000001',
        };
        await database.addDevice(device);

        const group = await database.addGroup({ name: 'Test Group' });
        await database.addDeviceToGroup(device.serialnumber, `${group._id}`);

        await database.setDeviceAlarm(device.serialnumber, true);
        const dev = await database.getDevice(device.serialnumber);
        const grp = await database.getGroup(`${group._id}`);
        expect(dev.alarmState).toBe(true);
        expect(grp.alarmState).toBe(true);
      });

      it('setDeviceAlarm sets the device alarm and group alarm correct with multiple devices', async () => {
        let group = await database.addGroup({ name: 'Test Group' });

        for (let i = 0; i < 10; i += 1) {
          await database.addDevice({
            name: `Test Device ${i}`,
            serialnumber: `00000000000000000000000${i}`,
          });

          await database.addDeviceToGroup(`00000000000000000000000${i}`, `${group._id}`);
        }

        for (let i = 0; i < 10; i += 1) {
          await database.setDeviceAlarm(`00000000000000000000000${i}`, true);
          let dev = await database.getDevice(`00000000000000000000000${i}`);
          let grp = await database.getGroup(`${group._id}`);
          expect(dev.alarmState).toBe(true);
          expect(grp.alarmState).toBe(true);
          await database.setDeviceAlarm(`00000000000000000000000${i}`, false);
          dev = await database.getDevice(`00000000000000000000000${i}`);
          grp = await database.getGroup(`${group._id}`);
          expect(dev.alarmState).toBe(false);
          expect(grp.alarmState).toBe(false);
        }

        group = await database.getGroup(`${group._id}`);
        expect(group.alarmState).toBe(false);

        for (let i = 0; i < 20; i += 1) {
          if (i < 10) {
            await database.setDeviceAlarm(`00000000000000000000000${i}`, true);
            const dev = await database.getDevice(`00000000000000000000000${i}`);
            const grp = await database.getGroup(`${group.id}`);
            expect(dev.alarmState).toBe(true);
            expect(grp.alarmState).toBe(true);
          } else {
            await database.setDeviceAlarm(`00000000000000000000000${i - 10}`, false);
            const dev = await database.getDevice(`00000000000000000000000${i - 10}`);
            const grp = await database.getGroup(`${group.id}`);
            expect(dev.alarmState).toBe(false);
            if (i === 19) {
              expect(grp.alarmState).toBe(false);
              return;
            }
            expect(grp.alarmState).toBe(true);
          }
        }

        group = await database.getGroup(`${group.id}`);
        expect(group.alarmState).toBe(true);
      });

      it('setDeviceAlarm throws an error if the serialnumber is not a string', async (done) => {
        await database.setDeviceAlarm(123, true).catch((err) => {
          expect(err.toString()).toMatch('Error: deviceSerialnumber has to be defined and of type string');
          done();
        });
      });

      it('setDeviceAlarm throws an error if the device does not exists', async (done) => {
        await database.setDeviceAlarm('000000000000000000000001', true).catch((err) => {
          expect(err.toString()).toMatch('Error: Device does not exists');
          done();
        });
      });

      it('getDeviceAlarm gets the device alarm correct', async () => {
        const device = {
          name: 'Test Device',
          serialnumber: '000000000000000000000001',
        };
        await database.addDevice(device);

        await database.setDeviceAlarm(device.serialnumber, true);
        const dev = await database.getDeviceAlarm(device.serialnumber);
        expect(dev).toBe(true);
      });

      it('getDeviceAlarm throws an error if the serialnumber is not a string', async (done) => {
        await database.getDeviceAlarm(123, true).catch((err) => {
          expect(err.toString()).toMatch('Error: deviceSerialnumber has to be defined and of type string');
          done();
        });
      });

      it('getDeviceAlarm throws an error if the device does not exists', async (done) => {
        await database.getDeviceAlarm('000000000000000000000001', true).catch((err) => {
          expect(err.toString()).toMatch('Error: Device does not exists');
          done();
        });
      });
    });
  });

  describe('getDurationOfAvailableData', () => {
    beforeEach(async () => {
      await database.clearCollection('uvcdevices');
      await database.clearCollection('airvolumes');
      await database.clearCollection('lampvalues');
      await database.clearCollection('tachos');
    });

    it('Returns the latest currentAirVolume Date', async () => {
      await database.addDevice({
        name: 'Test Device',
        serialnumber: '000000000000000000000001',
      });

      for (let i = 0; i < 10; i += 1) {
        await database.addAirVolume({
          volume: i,
          device: '1',
          date: new Date((i + 1) * 100),
        });
      }
      const duration = await database.getDurationOfAvailableData('1', 'currentAirVolume');
      expect(duration).toStrictEqual({
        to: new Date(10 * 100),
        from: new Date(100),
      });
    });

    it('Returns undefined if no currentAirVolume Document for that device exists', async (done) => {
      await database.addDevice({
        name: 'Test Device',
        serialnumber: '000000000000000000000001',
      });

      try {
        await database.getDurationOfAvailableData('1', 'currentAirVolume');
      } catch (error) {
        expect(error).toEqual(new Error('No data available.'));
        done();
      }
    });

    it('Returns the latest lampValues Date', async () => {
      await database.addDevice({
        name: 'Test Device',
        serialnumber: '000000000000000000000001',
      });

      for (let i = 0; i < 10; i += 1) {
        await database.addLampValue({
          lamp: (i + 1),
          value: 10,
          device: '000000000000000000000001',
          date: new Date((i + 1) * 100),
        });
      }
      const duration = await database.getDurationOfAvailableData('000000000000000000000001', 'lampValues');
      expect(duration).toEqual({
        to: new Date(10 * 100),
        from: new Date(100),
      });
    });

    it('Returns undefined if no lampValues Document for that device exists', async (done) => {
      await database.addDevice({
        name: 'Test Device',
        serialnumber: '000000000000000000000001',
      });

      try {
        await database.getDurationOfAvailableData('1', 'lampValues');
      } catch (error) {
        expect(error).toEqual(new Error('No data available.'));
        done();
      }
    });

    it('Returns the latest tacho Date', async () => {
      await database.addDevice({
        name: 'Test Device',
        serialnumber: '000000000000000000000001',
      });

      for (let i = 0; i < 10; i += 1) {
        await database.addTacho({
          tacho: 10,
          device: '1',
          date: new Date((i + 1) * 100),
        });
      }
      const duration = await database.getDurationOfAvailableData('1', 'tacho');
      expect(duration).toStrictEqual({
        to: new Date(10 * 100),
        from: new Date(100),
      });
    });

    it('Returns undefined if no tacho Document for that device exists', async (done) => {
      await database.addDevice({
        name: 'Test Device',
        serialnumber: '000000000000000000000001',
      });
      try {
        await database.getDurationOfAvailableData('1', 'tacho');
      } catch (error) {
        expect(error).toEqual(new Error('No data available.'));
        done();
      }
    });

    it('Returns the latest fanVoltage Date', async () => {
      await database.addDevice({
        name: 'Test Device',
        serialnumber: '000000000000000000000001',
      });

      for (let i = 0; i < 10; i += 1) {
        await database.addFanVoltage({
          voltage: 10,
          device: '000000000000000000000001',
          date: new Date((i + 1) * 100),
        });
      }
      const duration = await database.getDurationOfAvailableData('000000000000000000000001', 'fanVoltage');
      expect(duration).toEqual({
        to: new Date(10 * 100),
        from: new Date(100),
      });
    });

    it('Returns undefined if no fanVoltage Document for that device exists', async (done) => {
      await database.addDevice({
        name: 'Test Device',
        serialnumber: '000000000000000000000001',
      });

      try {
        await database.getDurationOfAvailableData('1', 'fanVoltage');
      } catch (error) {
        expect(error).toEqual(new Error('No data available.'));
        done();
      }
    });
  });

  describe('Group functions', () => {
    beforeEach(async () => {
      await database.clearCollection('uvcgroups');
      await database.clearCollection('uvcdevices');
    });

    it('addGroup adds a group correct and returns the object', async () => {
      const group = {
        name: 'Test Group 1',
      };

      const addedGroup = await database.addGroup(group);
      expect(addedGroup._id).toBeDefined();
      expect(addedGroup.name).toBe(group.name);
    });

    it('addGroup throws an error if validation fails', async () => {
      const device = {
      };

      await database.addGroup(device).catch((e) => {
        expect(e.toString()).toBe('Error: Name has to be defined.');
      });
    });

    it('getGroup gets a group correct and returns the object', async () => {
      const group = {
        name: 'Test Group 1',
      };

      const docGroup = await database.addGroup(group);
      const returnedGroup = await database.getGroup(`${docGroup._id}`);
      expect(returnedGroup.name).toBe(group.name);
      expect(returnedGroup.devices.length).toBe(0);
      expect(returnedGroup.alarmState).toBe(false);
      expect(returnedGroup.engineStateDevicesWithOtherState).toBeDefined();
      expect(returnedGroup.eventMode).toBe(false);
      expect(returnedGroup.eventModeDevicesWithOtherState).toBeDefined();
      expect(returnedGroup.engineLevel).toBe(0);
      expect(returnedGroup.engineLevelDevicesWithOtherState).toBeDefined();
    });

    it('getGroup throws error if name is not string', async () => {
      await database.getGroup(null).catch((err) => {
        expect(err.toString()).toBe('Error: GroupID has to be a string');
      });
    });

    it('getGroup throws error if group is not avalible', async () => {
      await database.getGroup('602e5dde6a51ff41b0625057').catch((err) => {
        expect(err.toString()).toBe('Error: Group does not exists');
      });
    });

    it('getGroups gets all groups', async () => {
      for (let i = 0; i < 10; i += 1) {
        await database.addGroup(
          {
            name: `Test Group ${i + 1}`,
          },
        );
      }

      const dbData = await database.getGroups();

      for (let i = 0; i < dbData.length; i += 1) {
        expect(dbData[i].name).toBe(`Test Group ${i + 1}`);
        expect(dbData[i].id).toBeDefined();
        expect(dbData[i].devices.length).toBe(0);
        expect(dbData[i].alarmState).toBe(false);
        expect(dbData[i].engineStateDevicesWithOtherState).toBeDefined();
        expect(dbData[i].eventMode).toBe(false);
        expect(dbData[i].eventModeDevicesWithOtherState).toBeDefined();
        expect(dbData[i].engineLevel).toBe(0);
        expect(dbData[i].engineLevelDevicesWithOtherState).toBeDefined();
      }
    });

    it('getDevicesInGroup throws error if name is not string', async () => {
      await database.getDevicesInGroup(null).catch((err) => {
        expect(err.toString()).toBe('Error: GroupID has to be a string');
      });
    });

    it('getDevicesInGroup throws error if group is not avalible', async () => {
      await database.getDevicesInGroup('602e5dde6a51ff41b0625057').catch((err) => {
        expect(err.toString()).toBe('Error: Group does not exists');
      });
    });

    it('getDevicesInGroup gets all devices in the group', async () => {
      const group = await database.addGroup({
        name: 'Test Group',
      });

      for (let i = 0; i < 10; i += 1) {
        await database.addDevice({
          name: 'Test Device',
          serialnumber: `${i}`,
        });
        await database.addDeviceToGroup(`${i}`, group._id.toString());
      }

      const grp = await database.getDevicesInGroup(group._id.toString());

      grp.forEach((device) => {
        expect(device.serialnumber).toBe(device.serialnumber);
        expect(device.name).toBe(device.name);
        expect(device.group.toString()).toMatch(group._id.toString());
        expect(device.engineState).toBe(false);
        expect(device.engineLevel).toBe(0);
        expect(device.alarmState).toBe(false);
        expect(device.currentFanState).toBeUndefined();
        expect(device.currentBodyState).toBeUndefined();
        expect(device.currentLampState.toString()).toMatch([].toString());
        expect(device.currentLampValue.toString()).toMatch([].toString());
        expect(device.eventMode).toBe(false);
        expect(device.tacho).toBeUndefined();
        expect(device.currentAirVolume).toBeUndefined();
      });
    });

    it('updateGroup updates a group correct and returns the object', async () => {
      const docGroup = await database.addGroup({
        name: 'Test Group 1',
      });

      const group = {
        id: `${docGroup._id}`,
        name: 'Test Group 2',
      };

      const updatedGroup = await database.updateGroup(group);
      expect(updatedGroup.name).toBe(group.name);
    });

    it('updateGroup updates a group with value as undefined and returns the object', async () => {
      const docGroup = await database.addGroup({
        name: 'Test Group 1',
      });

      const group = {
        id: `${docGroup._id}`,
        engineState: undefined,
      };

      const updatedGroup = await database.updateGroup(group);
      expect(updatedGroup.engineState).toBe(null);
    });

    it('updateGroup throws error if group is not available', async () => {
      const group = {
        id: '602e5dde6a51ff41b0625057',
        name: 'Test Group 2',
      };

      await database.updateGroup(group).catch((err) => {
        expect(err.toString()).toBe('Error: Group does not exists');
      });
    });

    it('updateGroup throws an error if validation fails', async () => {
      const group = {};

      await database.updateGroup(group).catch((e) => {
        expect(e.toString()).toBe('Error: id has to be defined.');
      });
    });

    it('deleteGroup deletes a group', async () => {
      const group = {
        name: 'Test Group 1',
      };

      const docGroup = await database.addGroup(group);
      group.id = `${docGroup._id}`;

      await database.deleteGroup(group);
      await database.getGroup(group.id).catch((err) => {
        expect(err.toString()).toBe('Error: Group does not exists');
      });
    });

    it('deleteGroup deletes a group and removes the group of each device in that group', async () => {
      const group = await database.addGroup({
        name: 'Test Group',
      });

      const devices = [];
      for (let i = 0; i < 10; i += 1) {
        devices.push({
          serialnumber: `00000000000000000000000${i}`,
          name: `TestDevice ${i}`,
        });
        const docDevice = await database.addDevice(devices[i]);
        await database.addDeviceToGroup(docDevice.serialnumber, `${group._id}`);
      }
      await database.deleteGroup(group);

      for (let i = 0; i < 10; i += 1) {
        const docDevice = await database.getDevice(devices[i].serialnumber);
        expect(docDevice.group).toStrictEqual({});
      }
    });

    it('deleteGroup throws error if Group is not available', async () => {
      await database.deleteGroup({ id: '602e5dde6a51ff41b0625057' }).catch((err) => {
        expect(err.toString()).toBe('Error: Group does not exists');
      });
    });

    it('addDeviceToGroup throws an error if devices does not exists', async () => {
      await database.addDeviceToGroup('602e5dde6a51ff41b0625057', '602e5dde6a51ff41b0625057').catch((err) => {
        expect(err.toString()).toBe('Error: Device 602e5dde6a51ff41b0625057 does not exists');
      });
    });

    it('addDeviceToGroup throws an error if group does not exists', async () => {
      const device = await database.addDevice({
        serialnumber: '000000000000000000000001',
        name: 'TestDevice',
      });

      await database.addDeviceToGroup(device.serialnumber, '000000000000000000000000').catch((err) => {
        console.log(err);
        expect(err.toString()).toBe('Error: Group does not exists');
      });
    });

    it('addDeviceToGroup adds an device to the group', async () => {
      const device = await database.addDevice({
        serialnumber: '000000000000000000000001',
        name: 'TestDevice',
      });
      const group = await database.addGroup({
        name: 'Test Group',
      });
      await database.addDeviceToGroup(device.serialnumber, `${group.id}`);
      const docGroup = await database.getGroup(`${group.id}`);
      const docDevice = await database.getDevice(`${device.serialnumber}`);
      expect(docGroup.devices.length).toBe(1);
      expect(docGroup.devices[0]._id.toString()).toMatch(device._id.toString());
      expect(docDevice.group.name).toStrictEqual(group.name);
      expect(docDevice.group._id.toString()).toMatch(group.id);
    });

    it.each([
      ['engineState', true],
      ['engineState', false],
      ['eventMode', true],
      ['eventMode', false],
      ['engineLevel', 1],
      ['engineLevel', 2],
    ])('addDeviceToGroup adds an device to the group and keeps properties %s with value %s', async (prop, value) => {
      const devObj = {
        serialnumber: '000000000000000000000001',
        name: 'TestDevice',
      };
      devObj[prop] = value;
      const device = await database.addDevice(devObj);

      let docDevice = await database.getDevice(`${device.serialnumber}`);
      expect(docDevice[prop]).toBe(value);

      const group = await database.addGroup({
        name: 'Test Group',
      });

      await database.addDeviceToGroup(device.serialnumber, `${group.id}`);

      const docGroup = await database.getGroup(`${group.id}`);
      docDevice = await database.getDevice(`${device.serialnumber}`);

      expect(docGroup.devices.length).toBe(1);
      expect(docGroup.devices[0]._id.toString()).toMatch(device._id.toString());
      expect(docDevice.group.name).toStrictEqual(group.name);
      expect(docDevice.group._id.toString()).toMatch(group.id);
      expect(docDevice[prop]).toStrictEqual(value);
    });

    it('addDeviceToGroup removes device from the group its assigned to', async () => {
      const device = await database.addDevice({
        serialnumber: '000000000000000000000001',
        name: 'TestDevice',
      });

      const group1 = await database.addGroup({
        name: 'Test Group1',
      });

      const group2 = await database.addGroup({
        name: 'Test Group2',
      });

      await database.addDeviceToGroup(device.serialnumber, `${group1.id}`);
      await database.addDeviceToGroup(device.serialnumber, `${group2.id}`);

      const docGroup1 = await database.getGroup(`${group1.id}`);
      const docGroup2 = await database.getGroup(`${group2.id}`);
      const docDevice = await database.getDevice(`${device.serialnumber}`);

      expect(docGroup1.devices.length).toBe(0);
      expect(docGroup2.devices.length).toBe(1);
      expect(docGroup2.devices[0].serialnumber.toString()).toMatch(device.serialnumber);
      expect(docDevice.group.name).toMatch(group2.name);
      expect(docDevice.group._id.toString()).toMatch(group2.id);
    });

    it('addDeviceToGroup adds an multiple devices to the group', async () => {
      const group = await database.addGroup({
        name: 'Test Group',
      });

      const devices = [];
      for (let i = 0; i < 10; i += 1) {
        devices.push({
          serialnumber: `00000000000000000000000${i}`,
          name: `TestDevice ${i}`,
        });
        const docDevice = await database.addDevice(devices[i]);
        await database.addDeviceToGroup(docDevice.serialnumber, `${group._id}`);
      }

      const docGroup = await database.getGroup(`${group._id}`);
      expect(docGroup.devices.length).toBe(10);
      for (let i = 0; i < 10; i += 1) {
        expect(docGroup.devices[i].serialnumber.toString()).toMatch(devices[i].serialnumber);
        const docDevice = await database.getDevice(`${docGroup.devices[i].serialnumber}`);
        expect(docDevice.group.name).toStrictEqual(group.name);
        expect(docDevice.group._id.toString()).toMatch(group.id);
      }
    });

    it.each([
      ['engineState', true],
      ['engineState', false],
      ['eventMode', true],
      ['eventMode', false],
      ['engineLevel', 1],
      ['engineLevel', 2],
    ])('addDeviceToGroup adds an multiple devices to the group and keeps properties %s with value %s', async (prop, value) => {
      const group = await database.addGroup({
        name: 'Test Group',
      });

      const devices = [];
      for (let i = 0; i < 10; i += 1) {
        const o = {
          serialnumber: `00000000000000000000000${i}`,
          name: `TestDevice ${i}`,
        };
        o[prop] = value;
        devices.push(o);
        const docDevice = await database.addDevice(devices[i]);
        await database.addDeviceToGroup(docDevice.serialnumber, `${group._id}`);
      }

      const docGroup = await database.getGroup(`${group._id}`);
      expect(docGroup.devices.length).toBe(10);
      for (let i = 0; i < 10; i += 1) {
        expect(docGroup.devices[i].serialnumber.toString()).toMatch(devices[i].serialnumber);
        const docDevice = await database.getDevice(`${docGroup.devices[i].serialnumber}`);
        expect(docDevice.group.name).toStrictEqual(group.name);
        expect(docDevice.group._id.toString()).toMatch(group.id);
        expect(docDevice[prop]).toBe(value);
      }
    });

    it('addDeviceToGroup sets the group of that device', async () => {
      const device = await database.addDevice({
        serialnumber: '000000000000000000000001',
        name: 'TestDevice',
      });
      const group = await database.addGroup({
        name: 'Test Group',
      });
      await database.addDeviceToGroup(device.serialnumber, `${group._id}`);
      const docDevice = await database.getDevice(device.serialnumber);
      expect(docDevice.group.name).toStrictEqual(group.name);
      expect(docDevice.group._id.toString()).toMatch(group.id);
    });

    it('addDeviceToGroup sets the group of multiple devices', async () => {
      const group = await database.addGroup({
        name: 'Test Group',
      });

      const devices = [];
      for (let i = 0; i < 10; i += 1) {
        devices.push({
          serialnumber: `00000000000000000000000${i}`,
          name: `TestDevice ${i}`,
        });
        const docDevice = await database.addDevice(devices[i]);
        await database.addDeviceToGroup(docDevice.serialnumber, `${group._id}`);
      }

      const docDevices = await database.getDevices();
      expect(docDevices.length).toBe(10);
      for (let i = 0; i < 10; i += 1) {
        expect(docDevices[i].group.name).toStrictEqual(group.name);
        expect(docDevices[i].group._id.toString()).toMatch(group.id);
      }
    });

    it('deleteDeviceFromGroup deletes an device from the group', async () => {
      const device = await database.addDevice({
        serialnumber: '000000000000000000000001',
        name: 'TestDevice',
      });
      const group = await database.addGroup({
        name: 'Test Group',
      });
      await database.addDeviceToGroup(device.serialnumber, `${group._id}`);
      await database.deleteDeviceFromGroup(device.serialnumber, `${group._id}`);
      const docGroup = await database.getGroup(`${group._id}`);
      expect(docGroup.devices.length).toBe(0);
      const docDevice = await database.getDevice(device.serialnumber);
      expect(docDevice.group).toStrictEqual({});
    });

    it('deleteDeviceFromGroup deletes an multiple devices from the group', async () => {
      const group = await database.addGroup({
        name: 'Test Group',
      });

      const devices = [];
      for (let i = 0; i < 10; i += 1) {
        devices.push({
          serialnumber: `00000000000000000000000${i}`,
          name: `TestDevice ${i}`,
        });
        const docDevice = await database.addDevice(devices[i]);
        await database.addDeviceToGroup(docDevice.serialnumber, `${group._id}`);
      }

      await database.deleteDeviceFromGroup('000000000000000000000005', `${group._id}`);
      await database.deleteDeviceFromGroup('000000000000000000000006', `${group._id}`);

      const docDevice1 = await database.getDevice('000000000000000000000005');
      expect(docDevice1.group).toStrictEqual({});

      const docDevice2 = await database.getDevice('000000000000000000000006');
      expect(docDevice2.group).toStrictEqual({});

      const docGroup = await database.getGroup(`${group._id}`);
      expect(docGroup.devices.length).toBe(8);
      for (let i = 0; i < 10; i += 1) {
        if (i === 5 || i === 6) return;
        expect(docGroup.devices[i].serialnumber.toString()).toBe(devices[i].serialnumber);
      }
    });

    describe('Group Alarm functions', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcgroups');
      });

      it('setGroupAlarm sets the Group alarm correct', async () => {
        const group = await database.addGroup({
          name: 'Test Group',
        });

        await database.setGroupAlarm(group.id, true);
        const dev = await database.getGroup(group.id);
        expect(dev.alarmState).toBe(true);
      });

      it('setGroupAlarm throws an error if the id is not a string', async (done) => {
        await database.setGroupAlarm(123, true).catch((err) => {
          expect(err.toString()).toMatch('Error: groupID has to be defined and of type string');
          done();
        });
      });

      it('setGroupAlarm throws an error if the Group does not exists', async (done) => {
        await database.setGroupAlarm('000000000000000000000001', true).catch((err) => {
          expect(err.toString()).toMatch('Error: Group does not exists');
          done();
        });
      });

      it('getGroupAlarm gets the Group alarm correct', async () => {
        const group = await database.addGroup({
          name: 'Test Group',
        });

        await database.setGroupAlarm(group.id, true);
        const dev = await database.getGroupAlarm(group.id);
        expect(dev).toBe(true);
      });

      it('getGroupAlarm throws an error if the id is not a string', async (done) => {
        await database.getGroupAlarm(123, true).catch((err) => {
          expect(err.toString()).toMatch('Error: groupID has to be defined and of type string');
          done();
        });
      });

      it('getGroupAlarm throws an error if the Group does not exists', async (done) => {
        await database.getGroupAlarm('000000000000000000000001', true).catch((err) => {
          expect(err.toString()).toMatch('Error: Group does not exists');
          done();
        });
      });
    });

    describe('Group lists that contain the devices that have not the appropiate state', () => {
      beforeEach(async () => {
        await database.clearCollection('uvcgroups');
        await database.clearCollection('uvcdevices');
      });

      it.each([
        'engineState',
        'engineLevel',
        'eventMode',
      ])('updateGroupDevicesWithOtherState updates the correct list when prop is %s', async (prop) => {
        const group = await database.addGroup({
          name: 'Test Group',
        });

        const devices = [];
        const serialnumbers = [];
        for (let i = 0; i < 10; i += 1) {
          serialnumbers.push(`00000000000000000000000${i}`);
          devices.push({
            serialnumber: `00000000000000000000000${i}`,
            name: `TestDevice ${i}`,
          });
          const docDevice = await database.addDevice(devices[i]);
          await database.addDeviceToGroup(docDevice.serialnumber, group._id.toString());
        }

        await database.updateGroupDevicesWithOtherState(group._id.toString(), prop, serialnumbers);

        const docGroup = await database.getGroup(group._id.toString());
        expect(docGroup[`${prop}DevicesWithOtherState`].length).toBe(devices.length);
        for (let i = 0; i < devices.length; i += 1) {
          expect(docGroup[`${prop}DevicesWithOtherState`][i].serialnumber)
            .toBe(devices[i].serialnumber);
        }
      });

      it('updateGroupDevicesWithOtherState throws an error if some serialnumbers do not are in the group', async () => {
        const group = await database.addGroup({
          name: 'Test Group',
        });

        const serialnumbers = ['000000000000000000000001'];

        await database.updateGroupDevicesWithOtherState(group._id.toString(), '', serialnumbers)
          .catch((e) => {
            expect(e.toString()).toMatch('Device with serialnumber 000000000000000000000001 is not in the Group');
          });
      });

      it('pushDeviceToEngineStateList pushes the device to the list', async () => {
        const group = await database.addGroup({
          name: 'Test Group',
        });

        const devices = [];
        for (let i = 0; i < 10; i += 1) {
          devices.push({
            serialnumber: `00000000000000000000000${i}`,
            name: `TestDevice ${i}`,
          });
          const docDevice = await database.addDevice(devices[i]);
          await database.addDeviceToGroup(docDevice.serialnumber, group._id.toString());
          await database.pushDeviceToEngineStateList(group._id.toString(), docDevice.serialnumber);
        }

        const docGroup = await database.getGroup(group._id.toString());
        expect(docGroup.engineStateDevicesWithOtherState.length).toBe(devices.length);
        for (let i = 0; i < devices.length; i += 1) {
          expect(docGroup.engineStateDevicesWithOtherState[i].serialnumber)
            .toBe(devices[i].serialnumber);
        }
      });

      it('pushDeviceToEngineStateList throws an error if the device does not exists', async () => {
        const group = await database.addGroup({
          name: 'Test Group',
        });

        await database.pushDeviceToEngineStateList(group._id.toString(), '000000000000000000000001')
          .catch((err) => {
            expect(err.toString()).toMatch('Error: Device is not in the Group');
          });
      });

      it('pullDeviceFromEngineStateList pushes the device to the list', async () => {
        const group = await database.addGroup({
          name: 'Test Group',
        });

        const devices = [];
        for (let i = 0; i < 10; i += 1) {
          devices.push({
            serialnumber: `00000000000000000000000${i}`,
            name: `TestDevice ${i}`,
          });
          const docDevice = await database.addDevice(devices[i]);
          await database.addDeviceToGroup(docDevice.serialnumber, group._id.toString());
          await database.pushDeviceToEngineStateList(group._id.toString(), docDevice.serialnumber);
        }

        await database.pullDeviceFromEngineStateList(group._id.toString(), devices[5].serialnumber);
        await database.pullDeviceFromEngineStateList(group._id.toString(), devices[6].serialnumber);

        const docGroup = await database.getGroup(group._id.toString());
        expect(docGroup.engineStateDevicesWithOtherState.length).toBe(devices.length - 2);
        for (let i = 0; i < devices.length - 2; i += 1) {
          if (i < 5) {
            expect(docGroup.engineStateDevicesWithOtherState[i].serialnumber)
              .toBe(devices[i].serialnumber);
          } else {
            expect(docGroup.engineStateDevicesWithOtherState[i].serialnumber)
              .toBe(devices[i + 2].serialnumber);
          }
        }
      });

      it('pullDeviceFromEngineStateList throws an error if the device is not in the group', async () => {
        const group = await database.addGroup({
          name: 'Test Group',
        });

        await database.pullDeviceFromEngineStateList(group._id.toString(), '000000000000000000000001')
          .catch((err) => {
            expect(err.toString()).toMatch('Error: Device is not in the Group');
          });
      });
    });
  });

  describe.only('Userrole functions', () => {
    beforeEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
    });

    it('AddUserrole adds an userrole to the database', async () => {
      const userrole = new Userrole('Admin', true, true);
      const newUserrole = await database.addUserrole(userrole);
      const docUserrole = await UserroleModel.findOne({ name: userrole.name }).lean();
      expect(docUserrole._id).toEqual(newUserrole._id);
      expect(docUserrole.userrolename).toEqual(newUserrole.userrolename);
      expect(docUserrole.canChangeProperties).toEqual(newUserrole.canChangeProperties);
      expect(docUserrole.canViewAdvancedData).toEqual(newUserrole.canViewAdvancedData);
      expect(docUserrole.canEditUserrole).toStrictEqual([]);
    });

    it('DeleteUserrole deletes userrole from database', async (done) => {
      const userrole = new Userrole('Admin', true, true);
      const newUserrole = await database.addUserrole(userrole);

      const docUserrole = await database.deleteUserrole(newUserrole.name);
      expect(docUserrole._id).toEqual(newUserrole._id);
      expect(docUserrole.name).toEqual(newUserrole.name);
      expect(docUserrole.canChangeProperties).toEqual(newUserrole.canChangeProperties);
      expect(docUserrole.canViewAdvancedData).toEqual(newUserrole.canViewAdvancedData);
      expect(docUserrole.canEditUserrole).toStrictEqual([]);

      try {
        await database.getUserrole(newUserrole.name);
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Userrole does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('GetUserrole gets userrole from database', async () => {
      const userrole = new Userrole('Admin', true, true);
      const dbUserrole = await database.addUserrole(userrole);

      const newUserrole = await database.getUserrole('Admin');

      expect(dbUserrole._id.toString()).toMatch(newUserrole.id.toString());
      expect(userrole.name).toEqual(newUserrole.name);
      expect(userrole.canChangeProperties).toEqual(newUserrole.canChangeProperties);
      expect(userrole.canViewAdvancedData).toEqual(newUserrole.canViewAdvancedData);
      expect(userrole.canEditUserrole).toEqual(newUserrole.canEditUserrole);
    });

    it('GetUserrole throws error if userrolename is not defined', async (done) => {
      try {
        await database.getUserrole();
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Userrolename has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUserrole throws error if username is not a string', async (done) => {
      try {
        await database.getUserrole(false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Userrolename has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUserrole throws error if userrole does not exists', async (done) => {
      try {
        await database.getUserrole('Admin');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Userrole does not exists');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUserroles gets all userroles from database', async () => {
      const userroles = [];

      for (let i = 0; i < 10; i += 1) {
        userroles.push(new Userrole(`Test Userrole ${1}`, (i % 2 === 1), true));
      }
      await Promise.all(userroles.map(async (userrole) => {
        await database.addUserrole(userrole);
      }));

      const dbUserroles = await database.getUserroles();
      expect(dbUserroles.length).toBe(userroles.length);
      for (let i = 0; i < dbUserroles.length; i += 1) {
        const userrole = dbUserroles[i];

        expect(userrole.name).toEqual(userroles[i].name);
        expect(userrole.canChangeProperties).toEqual(userroles[i].canChangeProperties);
        expect(userrole.canViewAdvancedData).toEqual(userroles[i].canViewAdvancedData);
        expect(userrole.canEditUserrole).toEqual(userroles[i].canEditUserrole);
      }
    });

    it('GetUserroles returns empty array if no userroles exists', async () => {
      const dbUserroles = await database.getUserroles();
      expect(dbUserroles.length).toBe(0);
    });
  });

  describe('User functions', () => {
    beforeEach(async () => {
      await database.clearCollection('users');
      await database.clearCollection('userroles');
    });

    it('AddUser adds user to database', async () => {
      const userrole = new Userrole('Admin', true, true);
      const newUserrole = await database.addUserrole(userrole);

      const user = new User('Test User', 'Test', 'Admin');
      const newUser = await database.addUser(user);
      const docUser = await UserModel.findOne({ username: user.username });
      expect(docUser._id).toEqual(newUser._id);
      expect(docUser.username).toEqual(newUser.username);
      expect(docUser.userrole).toEqual(newUserrole._id);
    });

    it('Throws an error if the argument is not an instance of the class user', async (done) => {
      try {
        await database.addUser({ username: 'Test' });
      } catch (e) {
        try {
          expect(e.toString()).toMatch('User has to be defined and an instance of the class User');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('DeleteUser deletes user from database', async (done) => {
      const userrole = new Userrole('Admin', true, true);
      const newUserrole = await database.addUserrole(userrole);
      const user = new User('Test User', 'Test', 'Admin');

      const newUser = await database.addUser(user);
      const dbUser = await database.deleteUser(newUser.username);
      expect(dbUser.id).toMatch(newUser._id.toString());
      expect(dbUser.username).toEqual(newUser.username);
      expect(dbUser.password).toEqual(newUser.password);
      expect(dbUser.canEdit).toEqual(newUser.canEdit);
      try {
        await database.getUser(newUser.username);
      } catch (err) {
        try {
          expect(err.toString()).toMatch('User does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('DeleteUser throws error if username is not a string', async (done) => {
      try {
        await database.deleteUser();
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Username has to be defined and of type string');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('UpdateUserrole updates userrole of user', async () => {
      await database.addUserrole(new Userrole('Admin', true, true));
      const guestUserrole = await database.addUserrole(new Userrole('Guest', true, true));

      const user = new User('Test User', 'Test', 'Admin');
      const newUser = await database.addUser(user);

      const dbUser = await database.updateUserrole('Test User', 'Guest');
      console.log(dbUser);

      expect(dbUser.id.toString()).toMatch(newUser._id.toString());
      expect(dbUser.userrole.toString()).toMatch(guestUserrole._id.toString());
    });

    it('UpdateUserrole throws error if username is not a string', async (done) => {
      try {
        await database.updateUserrole(true);
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Username has to be defined and of type string');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('UpdateUserrole throws error if userrole is not a string', async (done) => {
      try {
        await database.updateUserrole('Test User', true);
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Userrole has to be defined and of type string');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('UpdateUserrole throws error if user does not exists', async (done) => {
      await database.addUserrole(new Userrole('Admin', true, true));
      try {
        await database.updateUserrole('User', 'Admin');
      } catch (err) {
        try {
          expect(err.toString()).toMatch('User does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('UpdateUserrole throws error if userrole does not exists', async (done) => {
      await database.addUserrole(new Userrole('Admin', true, true));
      await database.addUser(new User('Test User', 'Test', 'Admin'));

      try {
        await database.updateUserrole('Test User', 'Userrole');
      } catch (err) {
        try {
          expect(err.toString()).toMatch('Userrole does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it('ChangeUserPassword changes the password of the user', async () => {
      const user = new User('Test User', 'Test', 'Admin');
      await database.addUserrole(new Userrole('Admin', true, true));
      await database.addUser(user);

      const dbUser = await database.changeUserPassword(
        user.username,
        user.password,
        'New Test',
      );
      expect(dbUser.username).toEqual(user.username);
      expect(bcrypt.compareSync('New Test', dbUser.password)).toBe(true);
    });

    it('ChangeUserPassword throws error if the old password does not match with the existing one', async (done) => {
      const user = new User('Test User', 'Test', 'Admin');
      await database.addUserrole(new Userrole('Admin', true, true));
      await database.addUser(user);

      await database.changeUserPassword(
        user.username,
        user.password,
        'New Test',
      );

      try {
        await database.changeUserPassword(user.username, 'Test Falsch', 'New Test');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('The old password does not match');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the user does not exists', async (done) => {
      try {
        await database.changeUserPassword('admin', 'Test Falsch', 'New Test');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('User does not exists');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the username is not defined', async (done) => {
      try {
        await database.changeUserPassword();
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Username has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the username is not type of string', async (done) => {
      try {
        await database.changeUserPassword(false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Username has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the oldPassword is not defined', async (done) => {
      try {
        await database.changeUserPassword('Test');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Old password has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the oldPassword is not type of string', async (done) => {
      try {
        await database.changeUserPassword('Test', false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('Old password has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the newPassword is not defined', async (done) => {
      try {
        await database.changeUserPassword('Test', 'Test');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('New password has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('ChangeUserPassword throws error if the newPassword is not type of string', async (done) => {
      try {
        await database.changeUserPassword('Test', 'Test', false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('New password has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUser gets user from database', async () => {
      const user = new User('Test User', 'Test', 'Admin');
      await database.addUserrole(new Userrole('Admin', true, true));
      const dbUser = await database.addUser(user);
      const newUser = await database.getUser(user.username);

      expect(dbUser.id.toString()).toMatch(newUser.id.toString());
      expect(dbUser.username).toEqual(newUser.username);
      expect(dbUser.userrole).toEqual(newUser.userrole);
    });

    it('GetUser throws error if username is not defined', async (done) => {
      try {
        await database.getUser();
      } catch (e) {
        try {
          expect(e.toString()).toMatch('username has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUser throws error if username is not a string', async (done) => {
      try {
        await database.getUser(false);
      } catch (e) {
        try {
          expect(e.toString()).toMatch('username has to be defined and of type string');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUser throws error if user does not exists', async (done) => {
      try {
        await database.getUser('602e5dde6a51ff41b0625057');
      } catch (e) {
        try {
          expect(e.toString()).toMatch('User does not exists');
          done();
        } catch (err) {
          done(err);
        }
      }
    });

    it('GetUsers gets all users from database', async () => {
      await database.addUserrole(new Userrole('Admin', true, true));
      const users = [];

      for (let i = 0; i < 10; i += 1) {
        users.push(new User(`Test User ${1}`, `Test ${i}`, 'Admin'));
      }
      await Promise.all(users.map(async (user) => {
        await database.addUser(user);
      }));

      const dbUsers = await database.getUsers();
      expect(dbUsers.length).toBe(users.length);
      for (let i = 0; i < dbUsers.length; i += 1) {
        const user = dbUsers[i];

        expect(user.username).toEqual(users[i].username);
        expect(user.canEdit).toEqual(users[i].canEdit);
      }
    });

    it('GetUsers returns empty array if no users exists', async () => {
      const dbUsers = await database.getUsers();
      expect(dbUsers.length).toBe(0);
    });
  });

  describe('Settings function', () => {
    beforeEach(async () => {
      await database.clearCollection('settings');
    });

    it('addSettings adds a settings object', async () => {
      const setting = new Settings('TestSetting');
      const docSetting = await database.addSettings(setting);

      expect(docSetting._id).toBeDefined();
      expect(docSetting.defaultEngineLevel).toBe(setting.defaultEngineLevel);

      const dbSetting = await SettingsModel.findById(docSetting._id);
      expect(docSetting._id.toString()).toMatch(dbSetting._id.toString());
      expect(dbSetting.defaultEngineLevel).toBe(setting.defaultEngineLevel);
    });

    it('getSettings gets a settings object', async () => {
      const setting = new Settings('TestSetting');
      await database.addSettings(setting);
      const docSetting = await database.getSetting(setting.name);

      expect(docSetting.name).toMatch(setting.name);
      expect(docSetting.defaultEngineLevel).toBe(setting.defaultEngineLevel);
    });

    it('getSetting throws an error if no document exists', async (done) => {
      try {
        await database.getSetting('TestSetting');
        done(new Error('getSetting did not throw'));
      } catch (error) {
        try {
          expect(error.message).toMatch('Setting does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });

    it.each([
      ['defaultEngineLevel', 5],
    ])('updateSetting updates the setting %s in the database with the new value %s', async (prop, value) => {
      const setting = new Settings('TestSetting');
      await database.addSettings(setting);

      setting[prop] = value;
      const docSetting = await database.updateSetting(setting);

      expect(docSetting[prop]).toBe(setting[prop]);
    });

    it('updateSetting throws an error if no document exists', async (done) => {
      const setting = new Settings('TestSetting');
      try {
        await database.updateSetting(setting);
        done(new Error('updateSetting did not throw'));
      } catch (error) {
        try {
          expect(error.message).toMatch('Setting does not exists');
          done();
        } catch (e) {
          done(e);
        }
      }
    });
  });
});
