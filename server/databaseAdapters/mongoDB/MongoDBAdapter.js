const mongoose = require('mongoose');
const EventEmitter = require('events');
const { ObjectId } = require('mongoose').Types;
const bcrypt = require('bcrypt');
const AirVolumeModel = require('./models/airVolume');
const AlarmStateModel = require('./models/alarmState');
const LampValueModel = require('./models/lampValue');
const TachoModel = require('./models/tacho');
const FanStateModel = require('./models/fanState');
const BodyStateModel = require('./models/bodyState');
const FanVoltageModel = require('./models/fanVoltage');
const CO2Model = require('./models/co2');
const TVOCModel = require('./models/TVOC');
const UVCDeviceModel = require('../../dataModels/UVCDevice').uvcDeviceModel;
const UVCGroup = require('../../dataModels/UVCGroup');
const MainLogger = require('../../Logger.js').logger;
const UserModel = require('./models/user');
const Settings = require('../../dataModels/Settings');
const SettingsModel = require('./models/settings');
const User = require('../../dataModels/User');
const UserroleModel = require('./models/userrole');
const Userrole = require('../../dataModels/Userrole');

const UVCGroupModel = UVCGroup.uvcGroupModel;

const logger = MainLogger.child({ service: 'MongoDBAdapter' });

module.exports = class MongoDBAdapter extends EventEmitter {
  /**
   * Creates an MongoDB adabter.
   * @param {String} uri The URI of the MongoDB Server
   * @param {String} databaseName The Database Name on the MongoDB Server
   * the Adapter should connect to
   */
  constructor(uri, databaseName) {
    super();
    if (uri === undefined || databaseName === undefined) throw new Error('uri and databaseName has to be defined');
    this.uri = uri;
    this.databaseName = databaseName;
    mongoose.set('useFindAndModify', false);
    mongoose.set('useUnifiedTopology', true);
  }

  // eslint-disable-next-line class-methods-use-this
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async connect() {
    logger.info(`Trying to connect to: mongodb://${this.uri}${(this.databaseName !== '') ? `/${this.databaseName}` : ''}`);
    await mongoose.connect(`mongodb://${this.uri}${(this.databaseName !== '') ? `/${this.databaseName}` : ''}`, {
      useNewUrlParser: true,
      useCreateIndex: true,
    });

    logger.info(`Connected to: mongodb://${this.uri}${(this.databaseName !== '') ? `/${this.databaseName}` : ''}`);
    this.db = mongoose.connection;
    this.emit('open');

    this.db.on('error', (e) => { throw e; });

    this.db.on('disconnected', () => {
      logger.info(`Database ${this.uri}/${this.databaseName} disconnected.`);
      this.emit('disconnected');
    });

    this.db.on('open', () => {
      logger.info(`Database ${this.uri}/${this.databaseName} connected.`);
      this.emit('open');
    });
  }

  /**
   * Closes the database connection gracefully.
   */
  async close() {
    if (this.db !== undefined) { await this.db.close(); }
  }

  /**
   * Clears the collection completely.
   * @param {String} collection Collectionname
   */
  async clearCollection(collection) {
    if (this.db !== undefined) { await this.db.collection(collection).deleteMany({}); }
  }

  /* eslint-disable class-methods-use-this */
  /* eslint-disable no-underscore-dangle */

  /**
   * Adds a Device to the MongoDB 'devices' database. Throws an error if the validation fails.
   * @param {Object} device Deviceobject that must have the properties serialnumber and name
   * @returns {Promise<mongoose.Document<any>>} The saved mongoose document
   */
  async addDevice(device) {
    if (this.db === undefined) throw new Error('Database is not connected');

    if (device.serialnumber === undefined) throw new Error('Serialnumber has to be defined.');

    logger.info('Adding device %s', device.name);

    const docDevice = new UVCDeviceModel(device);
    const err = docDevice.validateSync();
    if (err !== undefined) throw err;
    return docDevice.save();
  }

  /**
   * Gets an device with the given deviceID.
   * @param {String} serialnumber The device serialnumber of that device
   * @returns {Object} The device object
   */
  async getDevice(serialnumber) {
    if (this.db === undefined) throw new Error('Database is not connected');

    if (typeof serialnumber !== 'string') { throw new Error('Serialnumber has to be a string'); }

    logger.debug('Getting device %s', serialnumber);

    const device = await UVCDeviceModel.findOne({
      serialnumber,
    }).populate('currentLampState', 'date lamp state')
      .populate('currentAirVolume', 'date volume')
      .populate('tacho', 'date tacho')
      .populate('currentBodyState', 'date state')
      .populate('currentFanState', 'date state')
      .populate('currentFanVoltage', 'date voltage')
      .populate('currentCO2', 'date co2')
      .populate('currentTVOC', 'date tvoc')
      .populate('currentLampValue', 'date lamp value')
      .populate('group', 'name')
      .lean()
      .exec();

    if (device === null || device === undefined) throw new Error('Device does not exists');

    return {
      id: device._id,
      serialnumber: device.serialnumber,
      name: device.name,
      group: (device.group) ? device.group : { },
      engineState: device.engineState,
      engineLevel: device.engineLevel,
      alarmState: device.alarmState,
      currentCO2: (device.currentCO2) ? device.currentCO2 : { co2: '' },
      currentTVOC: (device.currentTVOC) ? device.currentTVOC : { tvoc: '' },
      currentFanVoltage: (device.currentFanVoltage) ? device.currentFanVoltage : { voltage: '' },
      currentBodyState: (device.currentBodyState) ? device.currentBodyState : { state: '' },
      currentFanState: (device.currentFanState) ? device.currentFanState : { state: '' },
      currentLampState: device.currentLampState,
      currentLampValue: device.currentLampValue,
      eventMode: device.eventMode,
      tacho: (device.tacho) ? device.tacho : { tacho: 0 },
      currentAirVolume: (device.currentAirVolume) ? device.currentAirVolume : { volume: 0 },
    };
  }

  /**
   * Gets all devices.
   */
  async getDevices() {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting devices');

    const db = await UVCDeviceModel.find()
      .populate('currentLampState', 'date lamp state')
      .populate('currentAirVolume', 'date volume')
      .populate('group', 'name')
      .populate('tacho', 'date tacho')
      .populate('currentBodyState', 'date state')
      .populate('currentFanState', 'date state')
      .populate('currentFanVoltage', 'date voltage')
      .populate('currentCO2', 'date co2')
      .populate('currentTVOC', 'date tvoc')
      .populate('currentLampValue', 'date lamp value')
      .lean()
      .exec();

    // eslint-disable-next-line prefer-const
    let devices = [];
    db.map((device) => {
      const d = {
        id: device._id,
        serialnumber: device.serialnumber,
        name: device.name,
        group: (device.group) ? device.group : { },
        engineState: device.engineState,
        engineLevel: device.engineLevel,
        alarmState: device.alarmState,
        currentCO2: (device.currentCO2) ? device.currentCO2 : { co2: '' },
        currentTVOC: (device.currentTVOC) ? device.currentTVOC : { tvoc: '' },
        currentFanVoltage: (device.currentFanVoltage) ? device.currentFanVoltage : { voltage: '' },
        currentBodyState: (device.currentBodyState) ? device.currentBodyState : { state: '' },
        currentFanState: (device.currentFanState) ? device.currentFanState : { state: '' },
        currentLampState: device.currentLampState,
        currentLampValue: device.currentLampValue,
        eventMode: device.eventMode,
        tacho: (device.tacho) ? device.tacho : { tacho: 0 },
        currentAirVolume: (device.currentAirVolume) ? device.currentAirVolume : { volume: 0 },
      };
      devices.push(d);
      return device;
    });

    return devices;
  }

  /**
   * Gets all devices.
   */
  async getSerialnumbers() {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting serialnumbers');

    const db = await UVCDeviceModel.find().lean().select('serialnumber').exec();

    // eslint-disable-next-line prefer-const
    let devices = [];
    db.map((device) => {
      devices.push(device.serialnumber);
      return device;
    });

    return devices;
  }

  /**
   * Updates the given device. Throws an error if the validation fails and if
   * the document not exists
   * @param {Object} device Deviceobject with the device
   * serialnumber and the propertie to change with the new value
   * @returns Returns updated device
   */
  async updateDevice(device) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (device.serialnumber === undefined) throw new Error('Serialnumber has to be defined.');

    logger.info('Updating device with %o', device);

    const d = await UVCDeviceModel.findOneAndUpdate(
      { serialnumber: device.serialnumber },
      device,
      { new: true },
    ).lean().exec();
    if (d === null) throw new Error('Device does not exists');
    return d;
  }

  /**
   * Deletes the given device that has the deviceID. Throws an error if the document not exists
   * @param {Object} serialnumber The device serialnumber of that device
   * @returns Deleted device
   */
  async deleteDevice(serialnumber) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof serialnumber !== 'string') { throw new Error('DeviceID has to be a string'); }

    logger.info('Deleting device %s', serialnumber);

    const device = await UVCDeviceModel.findOneAndDelete({ serialnumber }).lean().exec();
    if (device === null) throw new Error('Device does not exists');
    if (device.group !== undefined) {
      await UVCGroupModel.updateOne({
        _id: new ObjectId(device.group),
      }, {
        $pull: {
          devices: device._id,
        },
      }, { new: true })
        .lean().exec();
    }
    const d = {
      serialnumber: device.serialnumber,
      name: device.name,
      engineState: device.engineState,
      engineLevel: device.engineLevel,
      currentBodyAlarm: device.currentBodyAlarm,
      currentFanState: device.currentFanState,
      currentLampState: device.currentLampState,
      currentLampValue: device.currentLampValue,
      eventMode: device.eventMode,
      tacho: device.tacho,
      currentAirVolume: device.currentAirVolume,
    };
    return d;
  }

  /**
   * Adds an air volume document to the database and links the devices' currentAirVolume
   * field to that document
   * @param {Object} airVolume The Object with the device serialnumber of that
   * device and the current volume
   * @returns Returns the airVolume document
   */
  async addAirVolume(airVolume) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Adding AirVolume %o', airVolume);

    const docAirVolume = new AirVolumeModel(airVolume);
    const err = docAirVolume.validateSync();
    if (err !== undefined) throw err;

    await docAirVolume.save().catch((e) => {
      if (e) { throw e; }
    });

    UVCDeviceModel.updateOne({
      serialnumber: airVolume.device,
    }, {
      $set: {
        currentAirVolume: docAirVolume._id,
      },
    }, (e) => {
      if (e !== null) { throw e; }
    });

    return docAirVolume;
  }

  /**
   * Gets all AirVolume documents that match the deviceID
   * @param {String} serialnumber The device serialnumber of that device
   * @param {Date} fromDate The Date after the documents should be selected
   * @param {Date} toDate The Date before the documents should be selected
   * @returns {Array} Returns an array of AirVolumes that match the deviceID
   */
  async getAirVolume(serialnumber, fromDate, toDate) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting AirVolumes from device %s, from %s, to %s', serialnumber, fromDate, toDate);

    const query = AirVolumeModel.find({ device: serialnumber }, 'device volume date');
    if (fromDate !== undefined && fromDate instanceof Date) {
      query.gte('date', fromDate);
    }
    if (toDate !== undefined && toDate instanceof Date) {
      query.lte('date', toDate);
    }
    return query.lean().exec();
  }

  /**
   * Adds an lampState document which holds a current alarm, the device, the lamp and date
   * @param {Object} lampState The Object with the device serialnumber of that
   * device and the current alarm and lamp
   * @param {String} lampState.device The serialnumber of that device
   * @param {String} lampState.state The state of the alarm
   * @param {String} lampState.lamp The lamp of the alarmstate
   * @returns Returns the lampState document
   */
  async setLampState(lampState) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Setting lamp state %o', lampState);

    const docAlarmState = new AlarmStateModel(lampState);
    const err = docAlarmState.validateSync();
    if (err !== undefined) throw err;

    await docAlarmState.save();

    const device = await UVCDeviceModel.updateOne({
      serialnumber: lampState.device,
    }, {
      $set: {
        [`currentLampState.${lampState.lamp - 1}`]: docAlarmState._id,
      },
    }, (e) => {
      if (e !== null) { throw e; }
    });

    if (device === null) throw new Error('Device does not exists');

    return docAlarmState;
  }

  /**
   * Gets all AlarmState documents that match the deviceID
   * @param {String} serialnumber The device serialnumber of that device
   * @returns {Array} Returns an array of AlarmState that match the deviceID
   */
  async getLampState(serialnumber) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting lamp state for device %s', serialnumber);

    return AlarmStateModel.find({ device: serialnumber }, 'device lamp state date').lean().exec();
  }

  /**
   * Adds an lampValue document which holds the current value, the device, the lamp and date
   * @param {Object} lampValue The Object with the device serialnumber of that
   * device and the current value and lamp
   * @param {String} alarmState.device The serialnumber of that device
   * @param {String} alarmState.value The value of the lamp
   * @param {String} alarmState.lamp The lamp of the value
   * @returns Returns the lampValue document
   */
  async addLampValue(lampValue) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Adding lamp value %o', lampValue);

    const docLampValue = new LampValueModel(lampValue);
    const err = docLampValue.validateSync();
    if (err !== undefined) throw err;

    await docLampValue.save();

    await UVCDeviceModel.updateOne({
      serialnumber: lampValue.device,
    }, {
      $set: {
        [`currentLampValue.${lampValue.lamp - 1}`]: docLampValue._id,
      },
    }, (e) => {
      if (e !== null) { throw e; }
    });

    // if (device === null) throw new Error('Device does not exists');

    return docLampValue;
  }

  /**
   * Gets all LampValues documents that match the deviceID
   * @param {String} serialnumber The device serialnumber of that device
   * @param {Number} [lampID] The Lamp of which values should be get
   * @param {Date} [fromDate] The Date after the documents should be selected
   * @param {Date} [toDate] The Date before the documents should be selected
   * @returns {Array} Returns an array of LampValues that match the deviceID
   */
  async getLampValues(serialnumber, lampID, fromDate, toDate) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting lamp value for device %s, lamp %i, from %s, to %s', serialnumber, lampID, fromDate, toDate);

    const query = LampValueModel.find({ device: serialnumber }, 'device lamp value date');
    if (lampID !== undefined && typeof lampID === 'string') {
      query.where('lamp', lampID);
    }
    if (fromDate !== undefined && fromDate instanceof Date) {
      query.gte('date', fromDate);
    }
    if (toDate !== undefined && toDate instanceof Date) {
      query.lte('date', toDate);
    }
    query.sort({ lamp: 'asc', date: 'asc' });
    return query.lean().exec();
  }

  /**
   * Adds a Rotation Speed document to the database.
   * @param {Object} tacho The Tacho object with the device serialnumber of that
   * device and the tacho
   * @param {String} tacho.device The serialnumber of that device
   * @param {String} tacho.tacho The value of the tacho
   * @returns {Document<any>} Returns the Tacho Document
   */
  async addTacho(tacho) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Adding tacho value %o', tacho);

    const docTacho = new TachoModel(tacho);
    const err = docTacho.validateSync();
    if (err !== undefined) throw err;

    await docTacho.save().catch((e) => {
      throw e;
    });

    UVCDeviceModel.updateOne({
      serialnumber: tacho.device,
    }, {
      $set: {
        tacho: docTacho._id,
      },
    }, (e) => {
      if (e !== null) { throw e; }
    });

    return docTacho;
  }

  /**
   * Gets all Tacho documents of that device
   * @param {String} serialnumber The device serialnumber of that device
   * @param {Date} [fromDate] The Date after the documents should be selected
   * @param {Date} [toDate] The Date before the documents should be selected
   */
  async getTachos(serialnumber, fromDate, toDate) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting lamp value for device %s, from %s, to %s', serialnumber, fromDate, toDate);

    const query = TachoModel.find({ device: serialnumber }, 'device tacho date');
    if (fromDate !== undefined && fromDate instanceof Date) {
      query.gte('date', fromDate);
    }
    if (toDate !== undefined && toDate instanceof Date) {
      query.lte('date', toDate);
    }
    query.sort({ lamp: 'asc', date: 'asc' });
    return query.lean().exec();
  }

  /**
   * Adds a FanState document to the database.
   * @param {Object} fanState The FanState object with the device serialnumber of that device
   * and the fanState
   * @param {string} fanState.device the device serialnumber of that device
   * @param {string} fanState.state the alarm state
   * @param {string} [fanState.date] the alarm date
   * @returns {Document<any>} Returns the FanState Document
   */
  async addFanState(fanState) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Adding fan state %o', fanState);

    const docFanState = new FanStateModel(fanState);
    const err = docFanState.validateSync();
    if (err !== undefined) throw err;

    await docFanState.save().catch((e) => {
      logger.error(e);
      throw e;
    });

    await UVCDeviceModel.updateOne({
      serialnumber: fanState.device,
    }, {
      $set: {
        currentFanState: docFanState._id,
      },
    }).catch((e) => {
      logger.error(e);
      throw e;
    });

    return docFanState;
  }

  /**
   * Gets all FanState documents of that device
   * @param {String} serialnumber The device serialnumber of that device
   * @param {Date} [fromDate] The Date after the documents should be selected
   * @param {Date} [toDate] The Date before the documents should be selected
   */
  async getFanStates(serialnumber, fromDate, toDate) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting fan states for device %s, from %s, to %s', serialnumber, fromDate, toDate);

    const query = FanStateModel.find({ device: serialnumber }, 'device state date');
    if (fromDate !== undefined && fromDate instanceof Date) {
      query.gte('date', fromDate);
    }
    if (toDate !== undefined && toDate instanceof Date) {
      query.lte('date', toDate);
    }
    query.sort({ lamp: 'asc', date: 'asc' });
    return query.lean().exec();
  }

  /**
   * Adds a BodyState document to the database.
   * @param {Object} bodyState The BodyState object with the device serialnumber of that device and
   * the bodyState
   * @param {string} bodyAlarm.device the device serialnumber of that device
   * @param {string} bodyAlarm.state the alarm state
   * @returns {Document<any>} Returns the BodyState Document
   */
  async addBodyState(bodyState) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Adding body state %o', bodyState);

    const docBodyState = new BodyStateModel(bodyState);
    const err = docBodyState.validateSync();
    if (err !== undefined) throw err;

    await docBodyState.save().catch((e) => {
      logger.error(e);
      throw e;
    });

    await UVCDeviceModel.updateOne({
      serialnumber: bodyState.device,
    }, {
      $set: {
        currentBodyState: docBodyState._id,
      },
    }).catch((e) => {
      logger.error(e);
      throw e;
    });

    return docBodyState;
  }

  /**
   * Gets all BodyState documents of that device
   * @param {String} serialnumber The device serialnumber of that device
   * @param {Date} [fromDate] The Date after the documents should be selected
   * @param {Date} [toDate] The Date before the documents should be selected
   */
  async getBodyStates(serialnumber, fromDate, toDate) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting body state for device %s, from %s, to %s', serialnumber, fromDate, toDate);

    const query = BodyStateModel.find({ device: serialnumber }, 'device state date');
    if (fromDate !== undefined && fromDate instanceof Date) {
      query.gte('date', fromDate);
    }
    if (toDate !== undefined && toDate instanceof Date) {
      query.lte('date', toDate);
    }
    query.sort({ lamp: 'asc', date: 'asc' });
    return query.lean().exec();
  }

  /**
   * Adds a FanVoltage document to the database.
   * @param {Object} fanVoltage The FanVoltage object with the device serialnumber of that device and
   * the fanVoltage
   * @param {string} fanVoltage.device the device serialnumber of that device
   * @param {string} fanVoltage.voltage the alarm voltage
   * @returns {Document<any>} Returns the FanVoltage Document
   */
  async addFanVoltage(fanVoltage) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Adding fan voltage %o', fanVoltage);

    const docFanVoltage = new FanVoltageModel(fanVoltage);
    const err = docFanVoltage.validateSync();
    if (err !== undefined) throw err;

    await docFanVoltage.save().catch((e) => {
      logger.error(e);
      throw e;
    });

    await UVCDeviceModel.updateOne({
      serialnumber: fanVoltage.device,
    }, {
      $set: {
        currentFanVoltage: docFanVoltage._id,
      },
    }).catch((e) => {
      logger.error(e);
      throw e;
    });

    return docFanVoltage;
  }

  /**
   * Gets all FanVoltage documents of that device
   * @param {String} serialnumber The device serialnumber of that device
   * @param {Date} [fromDate] The Date after the documents should be selected
   * @param {Date} [toDate] The Date before the documents should be selected
   */
  async getFanVoltages(serialnumber, fromDate, toDate) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting fan voltage for device %s, from %s, to %s', serialnumber, fromDate, toDate);

    const query = FanVoltageModel.find({ device: serialnumber }, 'device voltage date');
    if (fromDate !== undefined && fromDate instanceof Date) {
      query.gte('date', fromDate);
    }
    if (toDate !== undefined && toDate instanceof Date) {
      query.lte('date', toDate);
    }
    query.sort({ lamp: 'asc', date: 'asc' });
    return query.lean().exec();
  }

  /**
   * Adds a CO2 document to the database.
   * @param {Object} co2 The CO2 object with the device serialnumber of that device and
   * the co2
   * @param {string} co2.device the device serialnumber of that device
   * @param {string} co2.co2 the alarm co2
   * @returns {Document<any>} Returns the CO2 Document
   */
  async addCO2(co2) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Adding co2 %o', co2);

    const docCO2 = new CO2Model(co2);
    const err = docCO2.validateSync();
    if (err !== undefined) throw err;

    await docCO2.save().catch((e) => {
      logger.error(e);
      throw e;
    });

    await UVCDeviceModel.updateOne({
      serialnumber: co2.device,
    }, {
      $set: {
        currentCO2: docCO2._id,
      },
    }).catch((e) => {
      logger.error(e);
      throw e;
    });

    return docCO2;
  }

  /**
   * Gets all CO2 documents of that device
   * @param {String} serialnumber The device serialnumber of that device
   * @param {Date} [fromDate] The Date after the documents should be selected
   * @param {Date} [toDate] The Date before the documents should be selected
   */
  async getCO2s(serialnumber, fromDate, toDate) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting co2 for device %s, from %s, to %s', serialnumber, fromDate, toDate);

    const query = CO2Model.find({ device: serialnumber }, 'device co2 date');
    if (fromDate !== undefined && fromDate instanceof Date) {
      query.gte('date', fromDate);
    }
    if (toDate !== undefined && toDate instanceof Date) {
      query.lte('date', toDate);
    }
    query.sort({ lamp: 'asc', date: 'asc' });
    return query.lean().exec();
  }

  /**
   * Adds a TVOC document to the database.
   * @param {Object} tvoc The TVOC object with the device serialnumber of that device and
   * the tvoc
   * @param {string} tvoc.device the device serialnumber of that device
   * @param {string} tvoc.tvoc the alarm tvoc
   * @returns {Document<any>} Returns the TVOC Document
   */
  async addTVOC(tvoc) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Adding tvoc %o', tvoc);

    const docTVOC = new TVOCModel(tvoc);
    const err = docTVOC.validateSync();
    if (err !== undefined) throw err;

    await docTVOC.save().catch((e) => {
      logger.error(e);
      throw e;
    });

    await UVCDeviceModel.updateOne({
      serialnumber: tvoc.device,
    }, {
      $set: {
        currentTVOC: docTVOC._id,
      },
    }).catch((e) => {
      logger.error(e);
      throw e;
    });

    return docTVOC;
  }

  /**
   * Gets all TVOC documents of that device
   * @param {String} serialnumber The device serialnumber of that device
   * @param {Date} [fromDate] The Date after the documents should be selected
   * @param {Date} [toDate] The Date before the documents should be selected
   */
  async getTVOCs(serialnumber, fromDate, toDate) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting tvocs for device %s, from %s, to %s', serialnumber, fromDate, toDate);

    const query = TVOCModel.find({ device: serialnumber }, 'device tvoc date');
    if (fromDate !== undefined && fromDate instanceof Date) {
      query.gte('date', fromDate);
    }
    if (toDate !== undefined && toDate instanceof Date) {
      query.lte('date', toDate);
    }
    query.sort({ lamp: 'asc', date: 'asc' });
    return query.lean().exec();
  }

  /**
   * Gets the first and last date where a document of the provided propertie can be found
   * @param {string} serialnumber The device serialnumber of that device
   * @param {string} propertie The propertie to get the duration of
   */
  async getDurationOfAvailableData(serialnumber, propertie) {
    if (this.db === undefined) throw new Error('Database is not connected');
    let dataLatest = '';
    let dataOldest = '';

    logger.debug('Getting duration of available data of device %s for propertie %s', serialnumber, propertie);

    switch (propertie) {
      case 'currentAirVolume':
        dataLatest = await AirVolumeModel.find({ device: serialnumber })
          .sort({ date: -1 })
          .limit(1);
        dataOldest = await AirVolumeModel.find({ device: serialnumber })
          .sort({ date: 1 })
          .limit(1);
        if (dataLatest.length === 1 && dataOldest.length === 1) {
          return {
            from: dataOldest[0].date,
            to: dataLatest[0].date,
          };
        }
        if (dataLatest.length === 0 && dataOldest.length === 0) {
          throw new Error('No data available.');
        }
        return undefined;
      case 'lampValues':
        dataLatest = await LampValueModel.find({ device: serialnumber })
          .sort({ date: -1 }).limit(1);
        dataOldest = await LampValueModel.find({ device: serialnumber })
          .sort({ date: 1 }).limit(1);
        if (dataLatest.length === 1 && dataOldest.length === 1) {
          return {
            from: dataOldest[0].date,
            to: dataLatest[0].date,
          };
        }
        if (dataLatest.length === 0 && dataOldest.length === 0) {
          throw new Error('No data available.');
        }
        return undefined;
      case 'tacho':
        dataLatest = await TachoModel.find({ device: serialnumber }).sort({ date: -1 }).limit(1);
        dataOldest = await TachoModel.find({ device: serialnumber }).sort({ date: 1 }).limit(1);
        if (dataLatest.length === 1 && dataOldest.length === 1) {
          return {
            from: dataOldest[0].date,
            to: dataLatest[0].date,
          };
        }
        if (dataLatest.length === 0 && dataOldest.length === 0) {
          throw new Error('No data available.');
        }
        return undefined;
      case 'fanVoltage':
        dataLatest = await FanVoltageModel.find({ device: serialnumber }).sort({ date: -1 })
          .limit(1);
        dataOldest = await FanVoltageModel.find({ device: serialnumber }).sort({ date: 1 })
          .limit(1);
        if (dataLatest.length === 1 && dataOldest.length === 1) {
          return {
            from: dataOldest[0].date,
            to: dataLatest[0].date,
          };
        }
        if (dataLatest.length === 0 && dataOldest.length === 0) {
          throw new Error('No data available.');
        }
        return undefined;
      case 'co2':
        dataLatest = await CO2Model.find({ device: serialnumber }).sort({ date: -1 })
          .limit(1);
        dataOldest = await CO2Model.find({ device: serialnumber }).sort({ date: 1 })
          .limit(1);
        if (dataLatest.length === 1 && dataOldest.length === 1) {
          return {
            from: dataOldest[0].date,
            to: dataLatest[0].date,
          };
        }
        if (dataLatest.length === 0 && dataOldest.length === 0) {
          throw new Error('No data available.');
        }
        return undefined;

      default:
        throw new Error(`Can not get duration of propertie ${propertie}`);
    }
  }

  /**
   * Adds an group with the provided name and returns the document
   * @param {Object} group An object that represents the group
   * @param {string} group.name The name of the group to be created
   */
  async addGroup(group) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (group.name === undefined) throw new Error('Name has to be defined.');

    logger.debug('Adding group with name %s', group.name);

    const docGroup = new UVCGroupModel(group);
    const err = docGroup.validateSync();
    if (err !== undefined) throw err;
    return docGroup.save();
  }

  /**
   * Gets the group by the given id
   * @param {string} groupID The group id
   */
  async getGroup(groupID) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof groupID !== 'string') {
      throw new Error('GroupID has to be a string');
    }

    logger.debug('Getting group %s', groupID);

    const groupData = await UVCGroupModel.findOne({ _id: groupID })
      .populate('devices')
      .populate('engineStateDevicesWithOtherState', 'serialnumber name')
      .populate('eventModeDevicesWithOtherState', 'serialnumber name')
      .populate('engineLevelDevicesWithOtherState', 'serialnumber name')
      .lean()
      .exec();

    if (groupData === null) {
      throw new Error('Group does not exists');
    }

    const group = {
      id: groupData._id,
      name: groupData.name,
      devices: groupData.devices,
      alarmState: groupData.alarmState,
      engineState: groupData.engineState,
      engineLevel: groupData.engineLevel,
      eventMode: groupData.eventMode,
      engineStateDevicesWithOtherState: groupData.engineStateDevicesWithOtherState,
      eventModeDevicesWithOtherState: groupData.eventModeDevicesWithOtherState,
      engineLevelDevicesWithOtherState: groupData.engineLevelDevicesWithOtherState,
    };

    return group;
  }

  /**
   * Gets all devices with all properties in the group
   * @param {string} groupID The group id
   */
  async getDevicesInGroup(groupID) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof groupID !== 'string') {
      throw new Error('GroupID has to be a string');
    }

    logger.debug('Getting devices in group', groupID);

    const groupData = await UVCGroupModel.findOne({ _id: groupID })
      .populate('devices')
      .exec().catch((e) => {
        throw e;
      });

    if (groupData === null) {
      throw new Error('Group does not exists');
    }

    return groupData.devices;
  }

  /**
   * Gets all groups
   */
  async getGroups() {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting all groups');

    const groupData = await UVCGroupModel.find()
      .populate('devices')
      .populate('engineStateDevicesWithOtherState', 'serialnumber name')
      .populate('eventModeDevicesWithOtherState', 'serialnumber name')
      .populate('engineLevelDevicesWithOtherState', 'serialnumber name')
      .lean()
      .exec();

    const groups = [];
    groupData.map((group) => {
      const d = {
        id: group._id,
        name: group.name,
        devices: group.devices,
        alarmState: group.alarmState,
        engineState: group.engineState,
        engineLevel: group.engineLevel,
        eventMode: group.eventMode,
        engineStateDevicesWithOtherState: group.engineStateDevicesWithOtherState,
        eventModeDevicesWithOtherState: group.eventModeDevicesWithOtherState,
        engineLevelDevicesWithOtherState: group.engineLevelDevicesWithOtherState,
      };
      groups.push(d);
      return group;
    });

    return groups;
  }

  async getGroupIDs() {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.debug('Getting all group ids');

    const groupData = await UVCGroupModel.find().lean()
      .exec();

    const groupIDs = [];
    groupData.map((grp) => {
      groupIDs.push(grp._id);
      return grp;
    });

    return groupIDs;
  }

  /**
   *
   * @param {Object} group The object representing the group
   * @param {string} group.id The object representing the group
   * @param {string} [group.name] The new name of the group
   * @param {string} [group.engineLevel] The new name of the group
   * @param {string} [group.engineState] The new name of the group
   * @param {string} [group.eventMode] The new name of the group
   */
  async updateGroup(group) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (group.id === undefined || typeof group.id !== 'string') throw new Error('id has to be defined.');

    logger.info('Updating group %s with %o', group.id, group);

    const docGroup = await UVCGroupModel.findOneAndUpdate(
      { _id: new ObjectId(group.id) },
      group,
      { new: true },
    ).lean().exec();

    if (docGroup === null) {
      throw new Error('Group does not exists');
    }

    return docGroup;
  }

  /**
   *
   * @param {Object} group The object representing the group
   * @param {string} group.id The object representing the group
   */
  async deleteGroup(group) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (group.id === undefined || typeof group.id !== 'string') throw new Error('id has to be defined and typeof string.');

    logger.info(`Deleting group ${group}`);

    const devices = await (await this.getGroup(`${group.id}`)).devices;
    for (let i = 0; i < devices.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await UVCDeviceModel.updateOne({
        serialnumber: devices[i]._id,
      }, {
        $unset: {
          group: 1,
        },
      }, { new: true }, (e) => {
        if (e !== null) { throw e; }
      }).lean().exec();
    }

    const docGroup = await UVCGroupModel.findOneAndDelete(
      { _id: new ObjectId(group.id) },
    ).lean().exec();

    if (docGroup === null) {
      throw new Error('Group does not exists');
    }

    return docGroup;
  }

  /**
   * Adds the given serialnumber of the device to the group if it is not already in that group.
   * Before that it checks, wether the device exists.
   * @param {string} deviceSerialnumber The Serialnumber of the device that should be added
   * @param {string} groupID The group ID of the group the device should be added to
   */
  async addDeviceToGroup(deviceSerialnumber, groupID) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof deviceSerialnumber !== 'string') { throw new Error('deviceSerialnumber has to be defined and typeof string'); }
    if (typeof groupID !== 'string') { throw new Error('groupID has to be defined and typeof string'); }

    logger.info(`Adding device ${deviceSerialnumber} to group ${groupID}`);

    const docDevice = await UVCDeviceModel.findOne(
      {
        serialnumber: deviceSerialnumber,
      },
    ).lean().exec();

    if (docDevice === null) {
      throw new Error(`Device ${deviceSerialnumber} does not exists`);
    }

    if (docDevice.group !== undefined) {
      await this.deleteDeviceFromGroup(`${docDevice.serialnumber}`, `${docDevice.group}`);
    }

    logger.debug(`Setting group of device ${deviceSerialnumber} to group ${groupID}`);
    await UVCDeviceModel.findOneAndUpdate(
      {
        serialnumber: deviceSerialnumber,
      },
      { group: new ObjectId(groupID) },
    ).exec().catch((e) => {
      throw e;
    });

    logger.debug(`Adding device ${deviceSerialnumber} to group ${groupID} device array`);
    const docGroup = await UVCGroupModel.findOneAndUpdate({
      _id: new ObjectId(groupID),
    }, {
      $addToSet: {
        devices: docDevice._id,
      },
    }, (e) => {
      if (e !== null) { throw e; }
    }).exec().catch((e) => {
      throw e;
    });

    return docGroup;
  }

  /**
   * Delete the device with the given serialnumber from the group.
   * Before that it checks, wether the device exists.
   * @param {string} deviceSerialnumber The Serialnumber of the device that should be deleted
   * @param {string} groupID The group ID of the group the device should be deleted from
   *
   */
  async deleteDeviceFromGroup(deviceSerialnumber, groupID) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof deviceSerialnumber !== 'string') { throw new Error('deviceSerialnumber has to be defined and typeof string'); }
    if (typeof groupID !== 'string') { throw new Error('groupID has to be defined and typeof string'); }
    logger.info(`Deleting device ${deviceSerialnumber} from group ${groupID}`);

    logger.debug('Unsetting group of device %s', deviceSerialnumber);
    const docDevice = await UVCDeviceModel.findOneAndUpdate({
      serialnumber: deviceSerialnumber,
    }, {
      $unset: {
        group: 1,
      },
    }, { new: true }).exec().catch((e) => {
      throw e;
    });

    logger.debug('Removing device %s from group %s devices array', deviceSerialnumber, groupID);
    const docGroup = await UVCGroupModel.findOneAndUpdate({
      _id: new ObjectId(groupID),
    }, {
      $pull: {
        devices: docDevice._id,
      },
    }, { new: true }).exec().catch((e) => {
      throw e;
    });

    return docGroup;
  }

  /**
   * Updates the list of the given propertie to the array of device serialnumbers
   * @param {String} groupID The group id where the list should be updated
   * @param {String} propertie The propertie of which the list should be updated
   * @param {Array} serialnumbers An array of serialnumbers that should be set as the list
   */
  async updateGroupDevicesWithOtherState(groupID, propertie, serialnumbers) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof propertie !== 'string') { throw new Error('Propertie has to be defined and typeof string'); }
    if (typeof groupID !== 'string') { throw new Error('groupID has to be defined and typeof string'); }

    logger.debug('Updating devices that have not the state of the group %s, device %s on propertie %s', groupID, serialnumbers, propertie);

    const objectIDs = [];
    const prop = {};
    const devicesInGroup = await this.getDevicesInGroup(groupID);

    serialnumbers.forEach((serialnumber) => {
      const deviceInGroup = devicesInGroup
        .filter((dev) => dev.serialnumber === serialnumber);

      if (deviceInGroup.length !== 1) throw new Error(`Device with serialnumber ${serialnumber} is not in the Group`);

      objectIDs.push(new ObjectId(deviceInGroup[0].id));
    });

    async function updateGroup(updateProp) {
      return UVCGroupModel.findOneAndUpdate({
        _id: new ObjectId(groupID),
      }, {
        $set: updateProp,
      }, { new: true });
    }

    switch (propertie) {
      case 'engineState':
        prop.engineStateDevicesWithOtherState = objectIDs;
        return updateGroup(prop);
      case 'engineLevel':
        prop.engineLevelDevicesWithOtherState = objectIDs;
        return updateGroup(prop);
      case 'eventMode':
        prop.eventModeDevicesWithOtherState = objectIDs;
        return updateGroup(prop);
      default:
        throw new Error(`Can not update devices with other state list of propertie ${propertie}`);
    }
  }

  /**
   * @deprecated
   * Pushed the given device to the list of devices with other state for the propertie engingeState
   * @param {string} groupID The group id of which the device should be pushed to the list
   * @param {string} serialnumber The device that should be pushed
   * @returns New database object
   */
  async pushDeviceToEngineStateList(groupID, serialnumber) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof serialnumber !== 'string') { throw new Error('serialnumber has to be defined and typeof string'); }
    if (typeof groupID !== 'string') { throw new Error('groupID has to be defined and typeof string'); }

    const devices = await this.getDevicesInGroup(groupID);
    const device = devices.filter((dev) => dev.serialnumber === serialnumber);
    if (device.length !== 1) throw new Error('Device is not in the Group');

    return UVCGroupModel.findOneAndUpdate({
      _id: new ObjectId(groupID),
    }, {
      $addToSet: {
        engineStateDevicesWithOtherState: new ObjectId(device[0].id),
      },
    }, { new: true }).exec().catch((e) => {
      throw e;
    });
  }

  /**
   * @deprecated
   * Pull the given device of the list of devices with other state for the propertie engingeState
   * @param {string} groupID The group id of which the device should be pulled from the list
   * @param {string} serialnumber The device that should be pulled
   * @returns New database object
   */
  async pullDeviceFromEngineStateList(groupID, serialnumber) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof serialnumber !== 'string') { throw new Error('serialnumber has to be defined and typeof string'); }
    if (typeof groupID !== 'string') { throw new Error('groupID has to be defined and typeof string'); }

    const devices = await this.getDevicesInGroup(groupID);
    const device = devices.filter((dev) => dev.serialnumber === serialnumber);
    if (device.length !== 1) throw new Error('Device is not in the Group');

    return UVCGroupModel.findOneAndUpdate({
      _id: new ObjectId(groupID),
    }, {
      $pull: {
        engineStateDevicesWithOtherState: new ObjectId(device[0].id),
      },
    }, { new: true }).exec().catch((e) => {
      throw e;
    });
  }

  /**
   * Sets the alarm state of the given device
   * @param {string} deviceSerialnumber The Serialnumber of the device with the alarm
   * @param {string} alarmState The alarm state to be set
   */
  async setDeviceAlarm(deviceSerialnumber, alarmState) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof deviceSerialnumber !== 'string') { throw new Error('deviceSerialnumber has to be defined and of type string'); }
    if (typeof alarmState !== 'boolean') { throw new Error('alarmState has to be defined and of type boolean'); }

    logger.info(`Setting alarm state of device ${deviceSerialnumber} to ${alarmState}`);

    const d = await UVCDeviceModel.findOneAndUpdate({
      serialnumber: deviceSerialnumber,
    }, {
      $set: {
        alarmState,
      },
    }, { new: true }).exec().catch((e) => {
      logger.error(e);
      throw e;
    });

    if (d === null) {
      throw new Error('Device does not exists');
    }

    if (d.group !== undefined) {
      const group = await this.getGroup(`${d.group}`);
      await this.setGroupAlarm(`${d.group}`, UVCGroup.checkAlarmState(group));
    }

    return d;
  }

  /**
   * Gets the alarm state of the device
   * @param {string} deviceSerialnumber The Serialnumber of the device with the alarm
   */
  async getDeviceAlarm(deviceSerialnumber) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof deviceSerialnumber !== 'string') { throw new Error('deviceSerialnumber has to be defined and of type string'); }

    logger.info(`Getting alarm state of device ${deviceSerialnumber}`);

    const d = await UVCDeviceModel.findOne({
      serialnumber: deviceSerialnumber,
    }, 'alarmState');

    if (d === null) {
      throw new Error('Device does not exists');
    }

    return d.alarmState;
  }

  /**
   * Sets the alarm state of the given Group
   * @param {string} groupID The id of the Group with the alarm
   * @param {string} alarmState The alarm state to be set
   */
  async setGroupAlarm(groupID, alarmState) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof groupID !== 'string') { throw new Error('groupID has to be defined and of type string'); }
    if (typeof alarmState !== 'boolean') { throw new Error('alarmState has to be defined and of type boolean'); }

    logger.info(`Setting alarm state of group ${groupID} to ${alarmState}`);

    const d = await UVCGroupModel.findOneAndUpdate({
      _id: new ObjectId(groupID),
    }, {
      $set: {
        alarmState,
      },
    }, { new: true }).exec().catch((e) => {
      throw e;
    });

    if (d === null) {
      throw new Error('Group does not exists');
    }
  }

  /**
   * Gets the alarm state of the Group
   * @param {string} groupID The id of the Group with the alarm
   */
  async getGroupAlarm(groupID) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof groupID !== 'string') { throw new Error('groupID has to be defined and of type string'); }

    logger.info(`Getting alarm state of group ${groupID}`);

    const d = await UVCGroupModel.findOne({
      _id: new ObjectId(groupID),
    }, 'alarmState');

    if (d === null) {
      throw new Error('Group does not exists');
    }

    return d.alarmState;
  }

  /**
   * Adds an userrole with the given rights
   * @param {Userrole} userrole The userrole object to add
   */
  async addUserrole(userrole) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (!(userrole instanceof Userrole)) { throw new Error('Userrole has to be defined and an instance of the class User'); }

    try {
      await this.getUserrole(userrole.name);
      throw new Error('Userrole already exists');
    } catch (error) {
      if (error.message !== 'Userrole does not exists') throw error;
    }

    logger.info('Adding userrole %o', userrole);

    const userroleModelobject = {
      name: userrole.name,
      canEditUserrole: [],
    };

    Object.keys(userrole.rules).forEach((key) => {
      userroleModelobject[key] = userrole.rules[key].allowed;
    });

    await Promise.all(userrole.canEditUserrole.map(async (u) => {
      const userroleToEdit = await UserroleModel.findOne({
        name: u,
      }).lean().exec();
      if (userroleToEdit !== null) {
        userroleModelobject.canEditUserrole.push(userroleToEdit._id.toString());
      }
    }));

    const docUserrole = new UserroleModel(userroleModelobject);

    const err = docUserrole.validateSync();
    if (err !== undefined) throw err;
    return docUserrole.save();
  }

  /**
   * Gets an userrole with the given name
   * @param {String} userrolename The userrolename to get
   * @returns {Userrole}
   */
  async getUserrole(userrolename) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof userrolename !== 'string') { throw new Error('Userrolename has to be defined and of type string'); }

    logger.debug('Getting userrole %s', userrolename);

    const docUserrole = await UserroleModel.findOne({
      name: userrolename,
    }).populate('canEditUserrole').lean();

    if (docUserrole === null) {
      throw new Error('Userrole does not exists');
    }

    const allRights = Userrole.getUserroleRights();
    const rightsObject = {};
    allRights.forEach((right) => {
      rightsObject[right.propertie] = docUserrole[right.propertie];
    });

    return new Userrole(docUserrole.name, rightsObject, docUserrole.canEditUserrole);
  }

  /**
   * Updates an userrole with the given rights
   * @param {string} userrolename The userrole name to update
   * @param {Userrole} userrole The userrole object to updateWith
   */
  async updateUserrole(userrolename, userrole) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof userrolename !== 'string') { throw new Error('Name has to be defined and type of string'); }
    if (!(userrole instanceof Userrole)) { throw new Error('Userrole has to be defined and an instance of the class User'); }

    logger.info('Updating userrole %s with %o', userrolename, userrole);

    const userroleModelobject = {
      name: userrole.name,
      canEditUserrole: [],
    };

    Object.keys(userrole.rules).forEach((key) => {
      userroleModelobject[key] = userrole.rules[key].allowed;
    });

    await Promise.all(userrole.canEditUserrole.map(async (u) => {
      const userroleToEdit = await UserroleModel.findOne({
        name: u,
      }).lean().exec();
      if (userroleToEdit !== null) {
        userroleModelobject.canEditUserrole.push(userroleToEdit._id.toString());
      }
    }));

    const docUserrole = await UserroleModel.findOneAndUpdate(
      { name: userrolename },
      userroleModelobject,
      { new: true },
    ).lean().exec();

    if (docUserrole === null) throw new Error('Userrole does not exists');

    return docUserrole;
  }

  /**
   * Deletes an userrole with the given name
   * @param {String} userrolename The userrolename of the userrole to be deleted
   */
  async deleteUserrole(userrolename) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof userrolename !== 'string') { throw new Error('Userrolename has to be defined and of type string'); }

    logger.info('Deleting userrole %s', userrolename);
    const dbUserrole = await UserroleModel.findOne({ name: userrolename }).lean().exec();

    const userrolesWithDependencies = await UserroleModel.find({
      canEditUserrole: {
        $in: ObjectId(dbUserrole._id),
      },
    });

    await Promise.all(userrolesWithDependencies.map(async (userrole) => {
      await UserroleModel.findOneAndUpdate({
        name: userrole.name,
      }, {
        $pull: { canEditUserrole: dbUserrole._id },
      }).exec();
    }));

    return UserroleModel.findOneAndRemove({ name: userrolename }).lean().exec();
  }

  /**
   * Get all userroles
   */
  async getUserroles() {
    if (this.db === undefined) throw new Error('Database is not connected');

    const docUserroles = await UserroleModel.find().lean().exec();
    logger.debug('Getting all userroles');

    const userroles = [];
    docUserroles.forEach((userrole) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};

      allRights.forEach((right) => {
        rightsObject[right.propertie] = userrole[right.propertie];
      });

      userroles.push(new Userrole(userrole.name, rightsObject));
    });

    return userroles;
  }

  /**
   * Adds an user with the given rights
   * @param {User} user The user object to add
   */
  async addUser(user) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (!(user instanceof User)) { throw new Error('User has to be defined and an instance of the class User'); }

    logger.info('Adding user %o', user);

    try {
      await this.getUser(user.username);
      throw new Error('User already exists');
    } catch (error) {
      if (error.message !== 'User does not exists') throw error;
    }

    const userrole = await UserroleModel.findOne({ name: user.userrole }).lean().exec();
    if (userrole === null) throw new Error('Userrole does not exist');

    const hash = await bcrypt.hash(user.password, 10);

    const docUser = new UserModel({
      username: user.username,
      password: hash,
      userrole: userrole._id,
    });
    const err = docUser.validateSync();
    if (err !== undefined) throw err;
    return docUser.save();
  }

  /**
   * Deletes an user with the given username
   * @param {String} username The Username of the user to be deleted
   */
  async deleteUser(username) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof username !== 'string') { throw new Error('Username has to be defined and of type string'); }

    logger.info('Deleting user %o', username);

    return UserModel.findOneAndRemove({ username }).lean().exec();
  }

  /**
   * Updates the userrole of the user
   * @param {String} username The username of the user to be updated with
   * @param {String} userrole The new userrole of the user
   */
  async updateUserroleOfUser(username, userrole) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof username !== 'string') { throw new Error('Username has to be defined and of type string'); }
    if (typeof userrole !== 'string') { throw new Error('Userrole has to be defined and of type string'); }

    logger.info('Updating user %s to new role %s', username, userrole);

    const dbUserrole = await UserroleModel.findOne({ name: userrole }).lean().exec();
    if (dbUserrole === null) throw new Error('Userrole does not exists');

    const docUser = await UserModel.findOneAndUpdate(
      { username },
      { userrole: dbUserrole._id },
      { new: true },
    ).populate('userrole').lean();

    if (docUser === null) throw new Error('User does not exists');

    const allRights = Userrole.getUserroleRights();
    const rightsObject = {};

    allRights.forEach((right) => {
      rightsObject[right.propertie] = docUser.userrole[right.propertie];
    });

    return {
      id: docUser._id,
      username: docUser.username,
      userrole: new Userrole(docUser.userrole.name, rightsObject),
    };
  }

  /**
   * Changes the password of the user with the given rights
   * @param {String} username The username to change the password of
   * @param {String} oldPassword The old password of the user
   * @param {String} newPassword The new password of the user
   */
  async changeUserPassword(username, oldPassword, newPassword) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof username !== 'string') { throw new Error('Username has to be defined and of type string'); }
    if (typeof oldPassword !== 'string') { throw new Error('Old password has to be defined and of type string'); }
    if (typeof newPassword !== 'string') { throw new Error('New password has to be defined and of type string'); }

    const dbUser = await this.getUser(username);
    const match = await bcrypt.compare(oldPassword, dbUser.password);
    if (!match) throw new Error('The old password does not match!');

    logger.info('Updating password of user %s with %s', username, newPassword);

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    return UserModel.findOneAndUpdate(
      { username },
      {
        password: hashedNewPassword,
      }, { new: true },
    ).lean().exec();
  }

  /**
   * Gets an user with the given id
   * @param {String} username The user id to get
   */
  async getUser(username) {
    if (this.db === undefined) throw new Error('Database is not connected');
    if (typeof username !== 'string') { throw new Error('username has to be defined and of type string'); }

    logger.debug('Getting user %s', username);

    const docUser = await UserModel.findOne({
      username,
    }).populate('userrole')
      .lean()
      .exec();

    if (docUser === null) {
      throw new Error('User does not exists');
    }

    const allRights = Userrole.getUserroleRights();
    const rightsObject = {};
    allRights.forEach((right) => {
      rightsObject[right.propertie] = docUser.userrole[right.propertie];
    });

    return {
      id: docUser._id,
      username: docUser.username,
      password: docUser.password,
      userrole: new Userrole(docUser.userrole.name, rightsObject),
    };
  }

  /**
   * Get all users
   */
  async getUsers() {
    if (this.db === undefined) throw new Error('Database is not connected');

    const docUsers = await UserModel.find()
      .populate('userrole')
      .lean()
      .exec();

    logger.debug('Getting all users');

    const users = [];
    docUsers.forEach((user) => {
      const allRights = Userrole.getUserroleRights();
      const rightsObject = {};
      allRights.forEach((right) => {
        rightsObject[right.propertie] = user.userrole[right.propertie];
      });

      users.push({
        id: user._id,
        username: user.username,
        password: user.password,
        userrole: new Userrole(user.userrole.name, rightsObject),
      });
    });

    return users;
  }

  /**
   * Adds a settings document to the database
   * @param {Settings} settings Settings object
   */
  async addSettings(settings) {
    if (this.db === undefined) throw new Error('Database is not connected');

    if (!(settings instanceof Settings)) throw new Error('settings param must be instance of Settings');

    logger.info('Adding settings %o', settings);

    const docSettings = new SettingsModel(settings);
    const err = docSettings.validateSync();
    if (err !== undefined) throw err;
    return docSettings.save();
  }

  /**
   * Gets a settings document from the database
   * @param {string} name settings name
   */
  async getSetting(name) {
    if (this.db === undefined) throw new Error('Database is not connected');

    logger.info('Getting settings %s', name);

    const docSetting = await SettingsModel.findOne({ name }).lean().exec();

    if (docSetting === null) {
      throw new Error('Setting does not exists');
    }
    return {
      name: docSetting.name,
      defaultEngineLevel: docSetting.defaultEngineLevel,
    };
  }

  /**
   * Updates the settings in database
   * @param {Settings} settings Settings object with new settings
   */
  async updateSetting(settings) {
    if (this.db === undefined) throw new Error('Database is not connected');

    if (!(settings instanceof Settings)) throw new Error('settings param must be instance of Settings');

    logger.info('Updating settings with %o', settings);

    const docSettings = await SettingsModel.findOneAndUpdate({
      name: settings.name,
    }, settings, { new: true }).lean().exec();

    if (docSettings === null) {
      throw new Error('Setting does not exists');
    }

    return {
      name: docSettings.name,
      defaultEngineLevel: docSettings.defaultEngineLevel,
    };
  }
};
