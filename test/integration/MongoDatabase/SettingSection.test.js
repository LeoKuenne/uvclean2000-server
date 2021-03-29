/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
const SettingsModel = require('../../../server/databaseAdapters/mongoDB/models/settings.js');
const MongoDBAdapter = require('../../../server/databaseAdapters/mongoDB/MongoDBAdapter.js');
const Settings = require('../../../server/dataModels/Settings.js');

let database;

describe('MongoDBAdapter Settings Functions', () => {
  beforeAll(async () => {
    database = new MongoDBAdapter(global.__MONGO_URI__.replace('mongodb://', ''), '');
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
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
