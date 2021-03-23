const fs = require('fs');

const MainLogger = require('./server/Logger.js').logger;

const { setTransports } = require('./server/Logger.js');

const logger = MainLogger.child({ service: 'Startup' });

let path = '.';

if (process.argv.indexOf('-p') > -1) {
  // eslint-disable-next-line prefer-destructuring
  path = process.argv[process.argv.indexOf('-p') + 1];
}
logger.info(`Working directory ${path}`);

logger.info('Loading config');
const file = fs.readFileSync(`${path}/server/UVCleanServer.config.json`);
const configFile = JSON.parse(file);

logger.info(`Version ${configFile.version}`);

let config = {};
switch (configFile.env) {
  case 'production':
    config = configFile.production;
    logger.info('Loading config for production, description %s', config.desc);
    break;
  case 'development':
    config = configFile.development;
    logger.info('Loading config for development, description %s', config.desc);
    break;
  case 'staging':
    config = configFile.staging;
    logger.info('Loading config for staging, description %s', config.desc);
    break;

  default:
    logger.info(`Could not load enviroment "${process.env.NODE_ENV}" from config file. Exiting`, config);
    process.exit(1);
    break;
}
config.env = configFile.env;
global.config = config;
setTransports();

const { UVCleanServer } = require('./server/UVCleanServer.js');

const server = new UVCleanServer();

logger.info('Starting UVCServer...');

server.startServer();

process.on('SIGINT', async () => {
  await server.stopServer();
  process.exit(1);
});
