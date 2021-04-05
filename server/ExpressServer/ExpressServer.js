const express = require('express');
const fs = require('fs');
const http = (config.http.secure) ? require('https') : require('http');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const MainLogger = require('../Logger.js').logger;
const userMiddleware = require('./middleware/user');
const Userrole = require('../dataModels/Userrole.js');
const Settings = require('../dataModels/Settings.js');
const CreateUserCommand = require('../commands/UserCommand/CreateUserCommand.js');
const DeleteUserCommand = require('../commands/UserCommand/DeleteUserCommand.js');
const UpdateUserPasswordCommand = require('../commands/UserCommand/UpdateUserPasswordCommand.js');
const UpdateUserroleOfUserCommand = require('../commands/UserCommand/UpdateUserroleOfUserCommand.js');
const CreateUserroleCommand = require('../commands/UserCommand/CreateUserroleCommand.js');
const DeleteUserroleCommand = require('../commands/UserCommand/DeleteUserroleCommand.js');
const UpdateUserroleNameCommand = require('../commands/UserCommand/UpdateUserroleNameCommand.js');
const UpdateUserroleRightsCommand = require('../commands/UserCommand/UpdateUserroleRightsCommand.js');
const AuthenticationError = require('../errors/AuthenticationError.js');
const schedulerRoutes = require('./routes/schedulerRoutes');

const logger = MainLogger.child({ service: 'ExpressServer' });

module.exports = class ExpressServer {
  constructor(server, database, scheduler) {
    this.database = database;
    this.agenda = scheduler;

    const options = {};
    if (config.http.secure) {
      try {
        options.cert = fs.readFileSync(`${config.http.cert}`);
        options.key = fs.readFileSync(`${config.http.key}`);
      } catch (err) {
        logger.error('Could not load key and certificate files! Continuing without tls \n', err);
      }
    }

    this.app = express();
    this.httpServer = http.createServer(options, this.app);

    this.app.use(cors({
      origin: 'http://127.0.0.1:8080',
      credentials: true,
    }));
    this.app.use(express.json());
    this.app.use(cookieParser());

    const apiRouter = express.Router();

    schedulerRoutes.register(this.agenda, server);
    server.emit('error', { error: 'Test' });

    // Scheduler routes
    apiRouter.use('/scheduler', userMiddleware.isLoggedIn, schedulerRoutes.router);

    // Userrole Routes
    apiRouter.post('/createUserrole', userMiddleware.isLoggedIn, async (req, res, next) => {
      logger.info('Got request on createUserrole route. Request: %o', req.body);

      let newUserrole = null;
      try {
        const allRights = Userrole.getUserroleRights();
        const rightsObject = {};
        allRights.forEach((right) => {
          if (typeof req.body[right.propertie] === 'string') rightsObject[right.propertie] = req.body[right.propertie] === 'true';
          else rightsObject[right.propertie] = req.body[right.propertie];
        });

        newUserrole = await CreateUserroleCommand.execute(req.userData.username, req.body.userrole,
          rightsObject, req.body.canBeEditedByUserrole);

        return res.status(201).send(newUserrole);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });

        if (error instanceof AuthenticationError) {
          return res.status(403).send({ msg: error.message });
        }

        return res.status(401).send({
          msg: error.message,
        });
      }
    });

    apiRouter.post('/updateUserrole', userMiddleware.isLoggedIn, async (req, res, next) => {
      logger.info('Got request on updateUser route. Request: %o', req.body);

      const { action } = req.query;

      let allRights = null;
      let rightsObject = null;

      try {
        if (!action) {
          throw new Error('Action query parameter must be provided');
        }

        let newUser = null;

        switch (action) {
          case 'changeName':
            newUser = await UpdateUserroleNameCommand
              .execute(req.userData.username, req.body.oldUsername, req.body.newUsername);
            break;
          case 'changeRights':
            allRights = Userrole.getUserroleRights();
            rightsObject = {};
            allRights.forEach((right) => {
              if (typeof req.body[right.propertie] === 'string') rightsObject[right.propertie] = req.body[right.propertie] === 'true';
              else rightsObject[right.propertie] = req.body[right.propertie];
            });

            newUser = await UpdateUserroleRightsCommand.execute(req.userData.username,
              req.body.userrole, rightsObject, req.body.canBeEditedByUserrole);
            break;

          default:
            throw new Error('Action is not available');
        }

        return res.status(201).send(newUser);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });

        if (error instanceof AuthenticationError) {
          return res.status(403).send({ msg: error.message });
        }

        return res.status(401).send({
          msg: error.message,
        });
      }
    });

    apiRouter.post('/deleteUserrole', userMiddleware.isLoggedIn, async (req, res, next) => {
      logger.info('Got request on deleteUserrole route. Request: %o', req.body);

      let newUserrole = null;
      try {
        newUserrole = await DeleteUserroleCommand.execute(req.userData.username,
          req.body.userrole);

        return res.status(201).send(newUserrole);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });

        if (error instanceof AuthenticationError) {
          return res.status(403).send({ msg: error.message });
        }

        return res.status(401).send({
          msg: error.message,
        });
      }
    });

    apiRouter.get('/userrolerights', userMiddleware.isLoggedIn, async (req, res, next) => {
      logger.info('Got request on userrolerights route. Request: %o', req.body);

      try {
        return res.status(201).send(Userrole.getUserroleRights());
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        return res.status(401).send({
          msg: error.message,
        });
      }
    });

    apiRouter.get('/userroles', userMiddleware.isLoggedIn, async (req, res, next) => {
      logger.info('Got request on userroles route. Request: %o', req.body);

      try {
        const userroles = await database.getUserroles();
        return res.status(201).send(userroles);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        return res.status(401).send({
          msg: error.message,
        });
      }
    });

    // User routes
    apiRouter.post('/createUser', userMiddleware.isLoggedIn, userMiddleware.validateRegister, async (req, res, next) => {
      logger.info('Got request on createUser route. Request: %o', req.body);

      try {
        const newUser = await CreateUserCommand.execute(req.userData.username, req.body.username,
          req.body.password, req.body.userrole);
        return res.status(201).send(newUser);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });

        if (error instanceof AuthenticationError) {
          return res.status(403).send({ msg: error.message });
        }

        return res.status(401).send({
          msg: error.message,
        });
      }
    });

    apiRouter.post('/deleteUser', userMiddleware.isLoggedIn, async (req, res, next) => {
      logger.info('Got request on deleteUser route. Request: %o', req.body);

      try {
        const oldUser = await DeleteUserCommand.execute(req.userData.username, req.body.username);
        return res.status(201).send({ username: oldUser.username });
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });

        if (error instanceof AuthenticationError) {
          return res.status(403).send({ msg: error.message });
        }

        return res.status(401).send({
          msg: error.message,
        });
      }
    });

    apiRouter.post('/updateUser', userMiddleware.isLoggedIn, async (req, res, next) => {
      logger.info('Got request on updateUser route. Request: %o', req.body);

      const { action } = req.query;

      try {
        if (!action) {
          throw new Error('Action query parameter must be provided');
        }

        let newUser = null;

        switch (action) {
          case 'changePassword':
            newUser = await UpdateUserPasswordCommand.execute(req.userData.username,
              req.body.username, req.body.oldPassword, req.body.newPassword,
              req.body.newPasswordRepeated);
            break;
          case 'changeUserrole':
            newUser = await UpdateUserroleOfUserCommand.execute(req.userData.username, req.body.username,
              req.body.newUserrole);
            break;

          default:
            throw new Error('Action is not available');
        }

        return res.status(201).send(newUser);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });

        if (error instanceof AuthenticationError) {
          return res.status(403).send({ msg: error.message });
        }

        return res.status(401).send({
          msg: error.message,
        });
      }
    });

    apiRouter.get('/loggedinUser', async (req, res) => {
      logger.info('Got GET request on /loggedinUser');

      try {
        const token = req.cookies.UVCleanSID;
        const decoded = jwt.verify(
          token,
          'SECRETKEY',
        );

        const user = await database.getUser(decoded.username);

        return res.json({
          id: user.id,
          username: user.username,
          userrole: user.userrole,
        });
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        return res.status(401).send({ msg: 'Your session is not valid' });
      }
    });

    apiRouter.get('/user', async (req, res) => {
      const { username } = req.query;

      logger.info(`Got GET request on /user with username=${username}`);

      if (username === undefined || typeof username !== 'string') return res.status(401).send({ msg: 'Username has to be defined and type of string' });

      try {
        const db = await this.database.getUser(username);
        return res.json({
          id: db.id,
          username: db.username,
          userrole: db.userrole,
        });
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        return res.sendStatus(500);
      }
    });

    apiRouter.get('/users', async (req, res) => {
      logger.info('Got GET request on /users');

      try {
        const db = await this.database.getUsers();
        const users = [];
        db.map((user) => {
          users.push({
            username: user.username,
            userrole: user.userrole,
            id: user.id,
          });
          return user;
        });
        return res.json(users);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        return res.sendStatus(500);
      }
    });

    // Settings routes
    apiRouter.get('/settings', async (req, res) => {
      logger.info('Got GET request on /settings');

      try {
        const db = await this.database.getSetting('UVCServerSetting');
        return res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        return res.sendStatus(500);
      }
    });

    apiRouter.post('/settings', userMiddleware.isLoggedIn, async (req, res) => {
      logger.info('Got POST request on /settings');

      const setting = new Settings('UVCServerSetting');

      if (req.body.engineLevel) {
        setting.defaultEngineLevel = req.body.engineLevel;
      } else {
        return res.sendStatus(404);
      }

      try {
        const db = await this.database.updateSetting(setting);
        return res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        return res.sendStatus(500);
      }
    });

    // Device routes
    apiRouter.get('/devices', async (req, res) => {
      logger.info('Got GET request on /devices');
      try {
        const db = await this.database.getDevices();
        res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        res.sendStatus(500);
      }
    });

    apiRouter.get('/device', async (req, res) => {
      const serialnumber = req.query.device;
      logger.info(`Got GET request on /device with serialnumber=${serialnumber}`);

      try {
        const db = await this.database.getDevice(serialnumber);
        res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        res.sendStatus(500);
      }
    });

    apiRouter.get('/groups', async (req, res) => {
      logger.info('Got GET request on /groups');

      try {
        const db = await this.database.getGroups();
        res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        res.sendStatus(500);
      }
    });

    apiRouter.get('/group', async (req, res) => {
      const { id } = req.query;
      logger.info(`Got GET request on /group with id=${id}`);

      try {
        const db = await this.database.getGroup(id);
        res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        res.sendStatus(500);
      }
    });

    apiRouter.get('/groupids', async (req, res) => {
      logger.info('Got GET request on /groupids');
      try {
        const db = await this.database.getGroupIDs();
        res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        res.sendStatus(500);
      }
    });

    apiRouter.get('/serialnumbers', async (req, res) => {
      try {
        const db = await this.database.getSerialnumbers();
        res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        res.sendStatus(500);
      }
    });

    apiRouter.get('/deviceData', async (req, res) => {
      const serialnumber = req.query.device;
      const { propertie, from, to } = req.query;

      logger.info(`Got GET request on /deviceData with serialnumber=${serialnumber} propertie=${propertie}, from=${from}, to=${to}`);

      let db = '';

      try {
        switch (propertie) {
          case 'airVolume':
            db = await this.database.getAirVolume(serialnumber,
              (from === undefined || from === '') ? undefined : new Date(from),
              (to === undefined || to === '') ? undefined : new Date(to));
            break;
          case 'lampValues':
            db = await this.database.getLampValues(serialnumber, undefined,
              (from === undefined || from === '') ? undefined : new Date(from),
              (to === undefined || to === '') ? undefined : new Date(to));
            break;
          case 'tacho':
            db = await this.database.getTachos(serialnumber,
              (from === undefined || from === '') ? undefined : new Date(from),
              (to === undefined || to === '') ? undefined : new Date(to));
            break;
          case 'fanVoltage':
            db = await this.database.getFanVoltages(serialnumber,
              (from === undefined || from === '') ? undefined : new Date(from),
              (to === undefined || to === '') ? undefined : new Date(to));
            break;
          case 'co2':
            db = await this.database.getCO2s(serialnumber,
              (from === undefined || from === '') ? undefined : new Date(from),
              (to === undefined || to === '') ? undefined : new Date(to));
            break;
          default:
            res.sendStatus(404);
            return;
        }
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        res.sendStatus(500);
        return;
      }

      res.json(db);
    });

    apiRouter.get('/groupData', async (req, res) => {
      const groupID = req.query.group;
      const { propertie, from, to } = req.query;

      logger.info(`Got GET request on /groupData with id=${groupID} propertie=${propertie}, from=${from}, to=${to}`);

      const db = [];
      try {
        const devices = await this.database.getDevicesInGroup(groupID);

        await Promise.all(devices.map(async (dev) => {
          switch (propertie) {
            case 'airVolume':
              db.push(await this.database.getAirVolume(dev.serialnumber,
                (from === undefined || from === '') ? undefined : new Date(from),
                (to === undefined || to === '') ? undefined : new Date(to)));
              break;
            case 'tacho':
              db.push(await this.database.getTachos(dev.serialnumber,
                (from === undefined || from === '') ? undefined : new Date(from),
                (to === undefined || to === '') ? undefined : new Date(to)));
              break;
            default:
              break;
          }
        }));

        res.json(db);
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        res.sendStatus(500);
      }
    });

    apiRouter.get('/timestamps', async (req, res) => {
      const { propertie, device, group } = req.query;

      logger.info(`Got GET request on /timestamps with propertie=${propertie}, ${(device) ? `device=${device}` : `group=${group}`}`);

      if (device === undefined && group === undefined) {
        res.sendStatus(404);
        return;
      }

      let db = '';
      let prop = '';
      switch (propertie) {
        case 'airVolume':
          prop = 'currentAirVolume';
          break;
        case 'lampValues':
          prop = 'lampValues';
          break;
        case 'tacho':
          prop = 'tacho';
          break;
        case 'fanVoltage':
          prop = 'fanVoltage';
          break;
        case 'co2':
          prop = 'co2';
          break;
        default:
          res.sendStatus(404);
          return;
      }

      try {
        if (device) {
          db = await this.database.getDurationOfAvailableData(device, prop);
          res.json(db);
        } else if (group) {
          const devicesInGroup = await this.database.getDevicesInGroup(group);

          let durations = { from: '', to: '' };

          await Promise.all(devicesInGroup.map(async (dev) => {
            const duration = await this.database
              .getDurationOfAvailableData(dev.serialnumber, prop);

            if (durations.from === '') {
              durations = duration;
            } else {
              if (duration.from > durations.from) durations.from = duration.from;
              if (duration.to < durations.to) durations.to = duration.to;
            }
          }));

          res.json(durations);
        }
      } catch (error) {
        server.emit('error', { service: 'ExpressServer', error });
        if (error.message === 'No data available.') { res.sendStatus(404); return; }
        res.sendStatus(500, error);
      }
    });

    // User log in, log out routes
    this.app.post('/login', async (req, res, next) => {
      logger.info('Got request on login route. Request: %o', req.body);

      try {
        if (req.cookies.UVCleanSID !== undefined) throw new Error('Session already exists. Please leave one session before entering another one');

        const user = await this.database.getUser(req.body.username);
        logger.debug('User exists in database');
        const match = await bcrypt.compare(req.body.password, user.password);

        if (match) {
          logger.debug('Password matches with database entry');
          const token = jwt.sign({
            username: user.username,
            userId: user.id,
          },
          'SECRETKEY', {
            expiresIn: '1d',
          });

          res.cookie('UVCleanSID', token, { httpOnly: true });
          logger.debug('Responding with cookie "UVCleanSID", token, %o with user %o', { httpOnly: true }, user);
          return res.status(201).send({
            user,
            url: '/ui/managment',
          });
        }

        logger.info('Password does not match with database entry');

        return res.status(401).send({
          msg: 'Username or password are incorrect!',
        });
      } catch (error) {
        res.status(500).send({
          msg: error.message,
        });
        server.emit('error', { service: 'ExpressServer', error });
      }
    });

    this.app.get('/logout', (req, res) => res.clearCookie('UVCleanSID').send({ url: '/ui/login' }));

    // Frontend Site
    this.app.use('/ui/login', express.static(`${__dirname}/sites/login.html`));
    this.app.use('/ui/managment', userMiddleware.isLoggedIn, express.static(`${__dirname}/sites/managment.html`));
    this.app.use('/static/', express.static(`${__dirname}/sites/static/`));

    this.app.use('/api/', apiRouter);

    this.app.get('*', (req, res) => {
      res.redirect('/ui/login');
    });
  }

  startExpressServer() {
    this.httpServer.listen(config.http.port, () => {
      logger.info(`HTTP listening on ${config.http.port}`);
    });
  }

  stopExpressServer() {
    if (this.httpServer.listening) {
      logger.info('Stopping Express Server');
      this.httpServer.close((err) => {
        if (err !== undefined) {
          logger.error(err);
        }
      });
    }
  }
};
