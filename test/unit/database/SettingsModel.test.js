const mongoose = require('mongoose');
const SettingModel = require('../../../server/databaseAdapters/mongoDB/models/settings');
const Settings = require('../../../server/dataModels/Settings');

const setting = new Settings('TestSetting');

describe('Setting Model Test', () => {
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

  it('create & save setting successfully', async () => {
    const validSetting = new SettingModel(setting);
    const savedSetting = await validSetting.save();

    expect(savedSetting._id).toBeDefined();
    expect(savedSetting.name).toBe(setting.name);
    expect(savedSetting.defaultEngineLevel).toBe(setting.defaultEngineLevel);
  });

  it('insert setting successfully, but the field not defined in schema should be undefined', async () => {
    setting.undefinedField = '';
    const settingWithInvalidField = new SettingModel(setting);
    const savedUserWithInvalidField = await settingWithInvalidField.save();
    expect(savedUserWithInvalidField._id).toBeDefined();
    expect(savedUserWithInvalidField.undefinedField).toBeUndefined();
  });
});
