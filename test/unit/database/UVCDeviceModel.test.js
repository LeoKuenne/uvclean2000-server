const mongoose = require('mongoose');
const UVCDeviceModel = require('../../../server/dataModels/UVCDevice').uvcDeviceModel;

const deviceData = {
  serialnumber: '1',
  name: 'Device 1',
  engineState: true,
  engineLevel: 1,
  currentLampState: [],
  eventMode: false,
  airVolume: 200,
  group: null,
};

describe('UVCDevice Model Test', () => {
  beforeAll(async () => {
    await mongoose.connect(`${global.__MONGO_URI__}`,
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
      }, (err) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
      });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('create & save device successfully', async () => {
    const validUVCDevice = new UVCDeviceModel(deviceData);
    const savedUVCDevice = await validUVCDevice.save();

    expect(savedUVCDevice.serialnumber).toBeDefined();
    expect(savedUVCDevice.serialnumber).toBe(deviceData.serialnumber);
    expect(savedUVCDevice.name).toBe(deviceData.name);
    expect(savedUVCDevice.group).toBe(null);
    expect(savedUVCDevice.engineState).toBe(deviceData.engineState);
    expect(savedUVCDevice.engineLevel).toBe(deviceData.engineLevel);
    expect(savedUVCDevice.currentBodyState).toBeUndefined();
    expect(savedUVCDevice.currentFanState).toBeUndefined();
    expect(savedUVCDevice.currentLampState).toBeDefined();
    expect(savedUVCDevice.eventMode).toBe(deviceData.eventMode);
    expect(savedUVCDevice.tacho).toBeUndefined();
    expect(savedUVCDevice.airVolume).toBeUndefined();
  });

  it('create & save device successfully without all paramters', async () => {
    const device = {
      serialnumber: '2',
      name: 'Device 1',
    };

    const validUVCDevice = new UVCDeviceModel(device);
    const savedUVCDevice = await validUVCDevice.save();

    expect(savedUVCDevice.serialnumber).toBeDefined();
    expect(savedUVCDevice.serialnumber).toBe(device.serialnumber);
    expect(savedUVCDevice.name).toBe(device.name);
    expect(savedUVCDevice.engineState).toBe(false);
    expect(savedUVCDevice.engineLevel).toBe(0);
    expect(savedUVCDevice.currentBodyState).toBeUndefined();
    expect(savedUVCDevice.currentFanState).toBeUndefined();
    expect(savedUVCDevice.currentLampState).toBeDefined();
    expect(savedUVCDevice.eventMode).toBe(false);
    expect(savedUVCDevice.tacho).toBeUndefined();
    expect(savedUVCDevice.currentAirVolume).toBeUndefined();
  });

  it('insert device successfully, but the field not defined in schema should be undefined', async () => {
    deviceData.serialnumber = '3';
    deviceData.undefinedField = '';
    const deviceWithInvalidField = new UVCDeviceModel(deviceData);
    const savedDeviceWithInvalidField = await deviceWithInvalidField.save();
    expect(savedDeviceWithInvalidField.serialnumber).toBeDefined();
    expect(savedDeviceWithInvalidField.serialnumber).toBe(deviceData.serialnumber);
    expect(savedDeviceWithInvalidField.undefinedField).toBeUndefined();
  });

  it('create device without required field should failed', async () => {
    const deviceWithoutRequiredField = new UVCDeviceModel({ name: '3' });
    let err;
    try {
      const savedDeviceWithoutRequiredField = await deviceWithoutRequiredField.save();
      error = savedDeviceWithoutRequiredField;
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.serialnumber).toBeDefined();
  });
});
