const fs = require('fs');
const socketio = require('socket.io');
const mqtt = require('mqtt');
const EventEmitter = require('events');
const MongooseError = require('mongoose').Error;
const ExpressServer = require('./ExpressServer/ExpressServer');
const MongoDBAdapter = require('./databaseAdapters/mongoDB/MongoDBAdapter');
const MainLogger = require('./Logger.js').logger;
const AddDevice = require('./controlModules/SocketIOCommands/AddDevice');
const DeleteDevice = require('./controlModules/SocketIOCommands/DeleteDevice');
const DeviceChangeState = require('./controlModules/SocketIOCommands/DeviceChangeState');
const DeviceStateChanged = require('./controlModules/MQTTEvents/DeviceStateChanged');
const AddGroup = require('./controlModules/SocketIOCommands/AddGroup');
const DeleteGroup = require('./controlModules/SocketIOCommands/DeleteGroup');
const GroupChangeState = require('./controlModules/SocketIOCommands/GroupChangeState');
const AddDeviceToGroup = require('./controlModules/SocketIOCommands/AddDeviceToGroup');
const RemoveDeviceFromGroup = require('./controlModules/SocketIOCommands/RemoveDeviceFromGroup');
const ResetDevice = require('./controlModules/SocketIOCommands/ResetDevice');
const AcknowledgeDeviceAlarm = require('./controlModules/SocketIOCommands/AcknowledgeDeviceAlarm');
const SetDevicesInGroup = require('./controlModules/SocketIOCommands/SetDevicesInGroup');
const { decrypt } = require('./controlModules/MQTTEvents/middleware/decrypt');
const AddUser = require('./controlModules/SocketIOCommands/AddUser');
const DeleteUser = require('./controlModules/SocketIOCommands/DeleteUser');
const UpdateUser = require('./controlModules/SocketIOCommands/UpdateUser');
const UpdateUserPassword = require('./controlModules/SocketIOCommands/UpdateUserPassword');
const IdentifyDevice = require('./controlModules/SocketIOCommands/IdentifyDevice');
const Settings = require('./dataModels/Settings');

const logger = MainLogger.child({ service: 'UVCleanServer' });

class UVCleanServer extends EventEmitter {
  constructor() {
    super();

    this.database = new MongoDBAdapter(`${config.database.mongoDB.uri}:${config.database.mongoDB.port}`,
      config.database.mongoDB.database);

    this.express = new ExpressServer(this, this.database);
    fs.writeFileSync(config.mqtt.secret, 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg=', { encoding: 'base64' });
  }

  async stopServer() {
    logger.info('Shutting down...');

    await this.database.close();

    this.express.stopExpressServer();

    if (this.client !== undefined) { this.client.end(); }

    this.io.close();
  }

  async startServer() {
    logger.info({ level: 'info', message: 'Starting server' });
    try {
      this.express.startExpressServer();

      this.io = socketio(this.express.httpServer, {
        cors: {
          origin: `http://${config.http.cors}`,
          methods: ['GET', 'POST'],
        },
      });

      this.on('error', (e) => {
        logger.error(e.error);
        this.io.emit('error', { message: `${e.service}: ${e.error.message}` });
      });

      this.on('info', (options) => {
        logger.info(options.message);
        this.io.emit('info', { message: `${options.service}: ${options.message}` });
      });

      // New Webbrowser connected to server
      this.io.on('connection', (socket) => {
        logger.info('A dashboard connected');
        logger.info(`Registering SocketIO Modules for socket ${socket.request.connection.remoteAddress}`);

        AddDevice(this, this.database, this.io, this.client, socket);
        DeleteDevice(this, this.database, this.io, this.client, socket);
        DeviceChangeState(this, this.database, this.io, this.client, socket);
        ResetDevice(this, this.database, this.io, this.client, socket);
        AcknowledgeDeviceAlarm(this, this.database, this.io, this.client, socket);
        AddGroup(this, this.database, this.io, this.client, socket);
        DeleteGroup(this, this.database, this.io, this.client, socket);
        GroupChangeState(this, this.database, this.io, this.client, socket);
        AddDeviceToGroup(this, this.database, this.io, this.client, socket);
        RemoveDeviceFromGroup(this, this.database, this.io, this.client, socket);
        SetDevicesInGroup(this, this.database, this.io, this.client, socket);
        AddUser(this, this.database, this.io, this.client, socket);
        DeleteUser(this, this.database, this.io, this.client, socket);
        UpdateUser(this, this.database, this.io, this.client, socket);
        UpdateUserPassword(this, this.database, this.io, this.client, socket);
        IdentifyDevice(this, this.database, this.io, this.client, socket);

        // Debug any messages that are coming from the frontend
        socket.onAny((event, ...args) => {
          logger.debug(`Socket.io Message: ${event}, %o`, args);
        });

        socket.on('disconnect', () => {
          logger.info('A dashboard disconnected');
        });
      });

      this.database.on('open', async () => {
        logger.info('Emitting info event on socket io for database connected');

        this.io.emit('databaseConnected');

        await Promise.all(config.user.map(async (user) => {
          logger.info(`Checking User ${user.username} to exists in database.`);
          try {
            await this.database.getUser(user.username);
            logger.info(`Checking User ${user.username} exists in database.`);
          } catch (error) {
            if (error.message === 'User does not exists') {
              logger.info(`Adding User ${user.username} to database with object %o`, user);
              this.database.addUser({
                username: user.username,
                password: user.username,
                canEdit: (user.canEdit !== undefined) ? user.canEdit === 'true' : false,
              });
              return;
            }
            throw error;
          }
        }));
        try {
          if (this.client.connected) {
            const db = await this.database.getDevices();
            db.forEach((device) => {
              logger.info(`Subscribing to UVClean/${device.serialnumber}/#`);
              this.client.subscribe(`UVClean/${device.serialnumber}/#`);
            });
          }
        } catch (error) {
          this.emit('error', { service: 'UVCleanServer', error });
        }

        // Checking for settings to exists
        try {
          await this.database.getSetting('UVCServerSetting');
          logger.info('Setting exists in database');
        } catch (error) {
          if (error.message === 'Setting does not exists') {
            logger.info('Setting does not exists in database. Creating setting with %o', config.settings);

            const setting = new Settings('UVCServerSetting');
            if (config.settings.defaultEngineLevel) setting.defaultEngineLevel = config.settings.defaultEngineLevel;
            await this.database.addSettings(setting);
            return;
          }
          throw error;
        }
      });

      this.database.on('disconnected', () => {
        logger.info('Emitting warn event on socket io for database disconnected');
        this.io.emit('warn', { message: 'Database disconnected' });
      });

      logger.info(`Trying to connect to: mqtt://${config.mqtt.broker}:${config.mqtt.port}`);
      this.client = mqtt.connect(`mqtt://${config.mqtt.broker}:${config.mqtt.port}`);

      // Register MQTT actions
      if (config.mqtt.useEncryption) DeviceStateChanged.use(decrypt);
      DeviceStateChanged.register(this, this.database, this.io, this.client);

      this.client.on('connect', async () => {
        logger.info(`Connected to: mqtt://${config.mqtt.broker}:${config.mqtt.port}`);
        this.io.emit('info', { message: 'MQTT Client connected' });
        try {
          // Subscribe to all devices that already exists if the database is connected
          if (this.database.isConnected()) {
            const db = await this.database.getDevices();
            db.forEach((device) => {
              logger.info(`Subscribing to UVClean/${device.serialnumber}/#`);
              this.client.subscribe(`UVClean/${device.serialnumber}/#`);
            });
          }
        } catch (error) {
          this.emit('error', { service: 'UVCleanServer', error });
        }
      });

      this.client.on('offline', async () => {
        logger.info(`Disconnected from: mqtt://${config.mqtt.broker}:${config.mqtt.port}`);
        this.io.emit('warn', { message: 'MQTT Client disconnected' });
      });

      await this.database.connect();
    } catch (e) {
      if (e instanceof MongooseError) {
        this.emit('error', { service: 'UVCleanServer', error: e });
      } else {
        logger.error(e);
      }
    }
  }
}

module.exports = {
  UVCleanServer,
};
