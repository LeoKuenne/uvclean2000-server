const jwt = require('jsonwebtoken');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'UserMiddleware' });

module.exports = {
  validateRegister: (req, res, next) => {
    logger.info('Validate sign up parameters, username: %s, password %s', req.body.username, req.body.username);
    if (!req.body.username) {
      logger.info('Validating username: %s failed', req.body.username);
      return res.status(400).send({
        msg: 'Please enter a username',
      });
    }
    if (!req.body.password) {
      logger.info('Validating password: %s failed', req.body.password);
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
    logger.info('Validate user to be logged in with cookie %o and query %o', req.cookies, req.query);
    try {
      const token = req.cookies.UVCleanSID;
      const decoded = jwt.verify(
        token,
        'SECRETKEY',
      );
      if (!req.query.user || req.query.user !== decoded.username) throw new Error('Query username does not match with cookie');
      logger.debug('User is logged in. %o', decoded);
      req.userData = decoded;
      next();
    } catch (err) {
      logger.debug('User is not logged in.');
      logger.error(err);
      return res.status(401).send('<p>Your session is not valid</p>');
    }
  },
};
