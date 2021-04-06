const fs = require('fs');
const socketio = require('socket.io');
const mqtt = require('mqtt');
const EventEmitter = require('events');
const MongooseError = require('mongoose').Error;
const ExpressServer = require('./ExpressServer/ExpressServer');
const MongoDBAdapter = require('./databaseAdapters/mongoDB/MongoDBAdapter');
const MainLogger = require('./Logger.js').logger;
const AddDevice = require('./commands/SocketIOCommands/AddDevice');
const DeleteDevice = require('./commands/SocketIOCommands/DeleteDevice');
const DeviceChangeState = require('./commands/SocketIOCommands/DeviceChangeState');
const DeviceStateChanged = require('./events/MQTTEvents/DeviceStateChanged');
const AddGroup = require('./commands/SocketIOCommands/AddGroup');
const DeleteGroup = require('./commands/SocketIOCommands/DeleteGroup');
const GroupChangeState = require('./commands/SocketIOCommands/GroupChangeState');
const AddDeviceToGroup = require('./commands/SocketIOCommands/AddDeviceToGroup');
const RemoveDeviceFromGroup = require('./commands/SocketIOCommands/RemoveDeviceFromGroup');
const ResetDevice = require('./commands/SocketIOCommands/ResetDevice');
const AcknowledgeDeviceAlarm = require('./commands/SocketIOCommands/AcknowledgeDeviceAlarm');
const SetDevicesInGroup = require('./commands/SocketIOCommands/SetDevicesInGroup');
const { decrypt } = require('./events/MQTTEvents/middleware/decrypt');
const AddUser = require('./commands/SocketIOCommands/AddUser');
const DeleteUser = require('./commands/SocketIOCommands/DeleteUser');
const UpdateUser = require('./commands/SocketIOCommands/UpdateUser');
const UpdateUserPassword = require('./commands/SocketIOCommands/UpdateUserPassword');
const IdentifyDevice = require('./commands/SocketIOCommands/IdentifyDevice');
const Settings = require('./dataModels/Settings');
const CreateUserCommand = require('./commands/UserCommand/CreateUserCommand');
const UpdateUserPasswordCommand = require('./commands/UserCommand/UpdateUserPasswordCommand');
const UpdateUserroleOfUserCommand = require('./commands/UserCommand/UpdateUserroleOfUserCommand');
const CreateUserroleCommand = require('./commands/UserCommand/CreateUserroleCommand');
const DeleteUserroleCommand = require('./commands/UserCommand/DeleteUserroleCommand');
const UpdateUserroleNameCommand = require('./commands/UserCommand/UpdateUserroleNameCommand');
const User = require('./dataModels/User');
const Userrole = require('./dataModels/Userrole');
const DeleteUserCommand = require('./commands/UserCommand/DeleteUserCommand');
const UpdateUserroleRightsCommand = require('./commands/UserCommand/UpdateUserroleRightsCommand');
const AgendaScheduler = require('./schedule/agenda');
const schedulerRoutes = require('./ExpressServer/routes/schedulerRoutes');

const logger = MainLogger.child({ service: 'UVCleanServer' });

class UVCleanServer extends EventEmitter {
  constructor() {
    super();

    this.on('error', (e) => {
      logger.error(e.error);
    });

    this.on('info', (options) => {
      logger.info(options.message);
    });

    this.database = new MongoDBAdapter(`${config.database.uri}:${config.database.port}`,
      config.database.database);

    this.agenda = new AgendaScheduler(`mongodb://${config.database.uri}:${config.database.port}/uvclean-server`, this, this.database, this.mqttClient);

    this.express = new ExpressServer(this, this.database, this.agenda);
    fs.writeFileSync(config.mqtt.secret, 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg=', { encoding: 'base64' });

    CreateUserCommand.register(this.database);
    DeleteUserCommand.register(this.database);
    UpdateUserPasswordCommand.register(this.database);
    UpdateUserroleOfUserCommand.register(this.database);
    CreateUserroleCommand.register(this.database);
    DeleteUserroleCommand.register(this.database);
    UpdateUserroleNameCommand.register(this.database);
    UpdateUserroleRightsCommand.register(this.database);
  }

  async stopServer() {
    logger.info('Shutting down...');

    await this.database.close();

    this.express.stopExpressServer();

    if (this.mqttClient !== undefined) { this.mqttClient.end(); }

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
        this.io.emit('error', { message: `${e.service}: ${e.error.message}` });
      });

      this.on('info', (options) => {
        this.io.emit('info', { message: `${options.service}: ${options.message}` });
      });

      // New Webbrowser connected to server
      this.io.on('connection', (socket) => {
        logger.info('A dashboard connected');
        logger.info(`Registering SocketIO Modules for socket ${socket.request.connection.remoteAddress}`);

        AddDevice(this, this.database, this.io, this.mqttClient, socket);
        DeleteDevice(this, this.database, this.io, this.mqttClient, socket);
        DeviceChangeState(this, this.database, this.io, this.mqttClient, socket);
        ResetDevice(this, this.database, this.io, this.mqttClient, socket);
        AcknowledgeDeviceAlarm(this, this.database, this.io, this.mqttClient, socket);
        AddGroup(this, this.database, this.io, this.mqttClient, socket);
        DeleteGroup(this, this.database, this.io, this.mqttClient, socket);
        GroupChangeState(this, this.database, this.io, this.mqttClient, socket);
        AddDeviceToGroup(this, this.database, this.io, this.mqttClient, socket);
        RemoveDeviceFromGroup(this, this.database, this.io, this.mqttClient, socket);
        SetDevicesInGroup(this, this.database, this.io, this.mqttClient, socket);
        AddUser(this, this.database, this.io, this.mqttClient, socket);
        DeleteUser(this, this.database, this.io, this.mqttClient, socket);
        UpdateUser(this, this.database, this.io, this.mqttClient, socket);
        UpdateUserPassword(this, this.database, this.io, this.mqttClient, socket);
        IdentifyDevice(this, this.database, this.io, this.mqttClient, socket);

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

        await config.userrole.reduce(async (memo, userrole) => {
          await memo;
          logger.info(`Checking Userrole ${userrole.userrolename} to exists in database.`);
          try {
            await this.database.getUserrole(userrole.userrolename);
            logger.info(`Userrole ${userrole.userrolename} exists in database.`);
          } catch (error) {
            if (error.message === `Userrole ${userrole.userrolename} does not exists`) {
              logger.info(`Adding Userrole ${userrole.userrolename} to database with object %o`, userrole);

              const allRights = Userrole.getUserroleRights();
              const rightsObject = {};
              allRights.forEach((right) => {
                rightsObject[right.propertie] = (userrole[right.propertie])
                  ? userrole[right.propertie] : false;
              });

              await this.database.addUserrole(
                new Userrole(userrole.userrolename, rightsObject, userrole.canBeEditedByUserrole),
              );
              return;
            }
            throw error;
          }
        }, undefined);

        await Promise.all(config.user.map(async (user) => {
          logger.info(`Checking User ${user.username} to exists in database.`);
          try {
            await this.database.getUser(user.username);
            logger.info(`Checking User ${user.username} exists in database.`);
          } catch (error) {
            if (error.message === `User ${user.username} does not exists`) {
              logger.info(`Adding User ${user.username} to database with object %o`, user);
              this.database.addUser(new User(user.username, user.password, user.userrole));
              return;
            }
            throw error;
          }
        }));

        try {
          if (this.mqttClient.connected) {
            const db = await this.database.getDevices();
            db.forEach((device) => {
              logger.info(`Subscribing to UVClean/${device.serialnumber}/#`);
              this.mqttClient.subscribe(`UVClean/${device.serialnumber}/#`);
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
      this.mqttClient = mqtt.connect(`mqtt://${config.mqtt.broker}:${config.mqtt.port}`);

      // Register MQTT actions
      if (config.mqtt.useEncryption) DeviceStateChanged.use(decrypt);
      DeviceStateChanged.register(this, this.database, this.io, this.mqttClient);

      this.mqttClient.on('connect', async () => {
        logger.info(`Connected to: mqtt://${config.mqtt.broker}:${config.mqtt.port}`);
        this.io.emit('info', { message: 'MQTT Client connected' });

        this.agenda.startScheduler(this.mqttClient, this.io);

        try {
          // Subscribe to all devices that already exists if the database is connected
          if (this.database.isConnected()) {
            const db = await this.database.getDevices();
            db.forEach((device) => {
              logger.info(`Subscribing to UVClean/${device.serialnumber}/#`);
              this.mqttClient.subscribe(`UVClean/${device.serialnumber}/#`);
            });
          }
        } catch (error) {
          this.emit('error', { service: 'UVCleanServer', error });
        }
      });

      this.mqttClient.on('offline', async () => {
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
