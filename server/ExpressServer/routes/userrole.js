const express = require('express');
const userMiddleware = require('../middleware/user');
const Userrole = require('../../dataModels/Userrole.js');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'ExpressServerUserroleAPI' });

const apiRouter = express.Router();
const server = null;

module.exports = {
  server,
  apiRouter,
};
