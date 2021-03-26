const jwt = require('jsonwebtoken');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UserMiddleware' });
let database = null;

module.exports = {
  register: (databaseAdapter) => { database = databaseAdapter; },
  validateRegister: (req, res, next) => {
    logger.debug('Validate sign up parameters, username: %s, password %s', req.body.username, req.body.username);
    if (!req.body.username) {
      logger.debug('Validating username: %s failed', req.body.username);
      return res.status(400).send({
        msg: 'Please enter a username',
      });
    }
    if (!req.body.password) {
      logger.debug('Validating password: %s failed', req.body.password);
      return res.status(400).send({
        msg: 'Please enter a password',
      });
    }

    if (!req.body.password_repeat) {
      logger.debug('Validating repeated password: %s failed', req.body.password_repeat);
      return res.status(400).send({
        msg: 'Please enter the repeated password',
      });
    }

    if (!req.body.userrole) {
      logger.debug('Validating userrole: %s failed', req.body.userrole);
      return res.status(400).send({
        msg: 'Please enter the userrole',
      });
    }
    logger.debug('Validating sign up paramters succeded');
    next();
  },
  isLoggedIn: (req, res, next) => {
    logger.debug('Validate user to be logged in with cookie %o and query %o', req.cookies, req.query);
    try {
      const token = req.cookies.UVCleanSID;
      const decoded = jwt.verify(
        token,
        'SECRETKEY',
      );
      // if (!req.query.user || req.query.user !== decoded.username)
      // throw new Error('Query username does not match with cookie');

      logger.debug('User is logged in. %o', decoded);
      req.userData = decoded;
      next();
    } catch (err) {
      logger.debug('User is not logged in.');
      logger.error(err);
      return res.status(401).send('<p>Your session is not valid</p>');
    }
  },
  canPerformAction: async (req, res, next) => {
    logger.debug('Checking wether user can perform action %s with cookie %o and query %o', req.cookies, req.query);

    const user = await database.getUser(req.userData.username);
    switch (req.route.path) {
      case '/createUserrole':
      case '/deleteUserrole':
      case '/updateUserrole':
        if (user.userrole.rules.canEditUserrole.allowed) {
          return next();
        }
        break;
      default:
        return res.status(404).send('No valid route.');
    }
    return res.status(403).send('You do not have the userrights for that action');
  },
};
