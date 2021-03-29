const express = require('express');
const MainLogger = require('../../Logger.js').logger;
const userMiddleware = require('../middleware/user');
const Userrole = require('../../dataModels/Userrole.js');

const logger = MainLogger.child({ service: 'ExpressServerUserroleAPI' });

const apiRouter = express.Router();
const server = null;

module.exports = {
  server,
  apiRouter,
};
