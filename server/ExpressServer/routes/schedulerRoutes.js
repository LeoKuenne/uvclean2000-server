const express = require('express');
const ScheduleEvent = require('../../schedule/module/ScheduleEvent');
const Action = require('../../schedule/module/Action');
const Time = require('../../schedule/module/Time');
const userMiddleware = require('../middleware/user');
const MainLogger = require('../../Logger.js').logger;
const CreateEvent = require('../../commands/Scheduler/CreateEvent');
const UpdateEvent = require('../../commands/Scheduler/UpdateEvent');
const DeleteEvent = require('../../commands/Scheduler/DeleteEvent');
const TestEvent = require('../../commands/Scheduler/TestEvent');

const logger = MainLogger.child({ service: 'ExpressSchedulerAPI' });

const router = express.Router();
let agenda = null;
let eventBus = null;

router.get('/events', async (req, res) => {
  logger.info('Got get on events route. Request: %o', req.body);

  try {
    const events = await agenda.getEvents();

    return res.status(201).send(events);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

    return res.status(401).send({
      msg: error.message,
    });
  }
});

router.get('/event', async (req, res) => {
  logger.info('Got get on event route. Request: %o', req.body);

  try {
    const event = await agenda.getEvent(req.body.id);

    return res.status(201).send(event);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

    if (error.message === 'The event does not exists') { return res.sendStatus(404); }

    return res.status(401).send({
      msg: error.message,
    });
  }
});

router.post('/event', userMiddleware.isLoggedIn, async (req, res) => {
  logger.info('Got post on event route. Request: %o', req.body);

  const { name, time, actions } = req.body;

  try {
    const scheduledEvent = await CreateEvent.execute(
      req.userData.username,
      name,
      new Time(time.days, new Date(time.timeofday)),
      actions.map((action) => new Action(action.group, action.propertie, action.newValue)),
    );

    return res.status(201).send(scheduledEvent);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

    if (error.message === 'The event does not exists') { return res.status(404).send({ msg: error.message }); }

    return res.status(401).send({
      msg: error.message,
    });
  }
});

router.put('/event', userMiddleware.isLoggedIn, async (req, res) => {
  logger.info('Got put on event route. Request: %o', req.body);
  const { scheduledEvent } = req.body;
  try {
    if (scheduledEvent === undefined) throw new Error('The event has to been defined');

    const updatedEvent = await UpdateEvent.execute(
      req.userData.username,
      new ScheduleEvent(scheduledEvent.id,
        scheduledEvent.name,
        new Time(scheduledEvent.time.days, new Date(scheduledEvent.time.timeofday)),
        scheduledEvent.actions.map(
          (action) => new Action(action.group, action.propertie, action.newValue),
        )),
    );

    return res.status(201).send(updatedEvent);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

    if (error.message === 'The event does not exists') { return res.status(404).send({ msg: error.message }); }

    return res.status(401).send({
      msg: error.message,
    });
  }
});

router.delete('/event', userMiddleware.isLoggedIn, async (req, res) => {
  logger.info('Got delete on event route. Request: %o', req.body);

  try {
    await DeleteEvent.execute(req.userData.username, req.body.id);

    return res.sendStatus(201);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

    return res.status(401).send({
      msg: error.message,
    });
  }
});

router.post('/testevent', userMiddleware.isLoggedIn, async (req, res) => {
  logger.info('Got post on test event route. Request: %o', req.body);

  try {
    await TestEvent.execute(req.userData.username, req.body.id);

    return res.status(201);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

    if (error.message === 'The event does not exists') { return res.status(404).send({ msg: error.message }); }

    return res.status(401).send({
      msg: error.message,
    });
  }
});

module.exports = {
  router,
  register(scheduler, server) {
    agenda = scheduler;
    eventBus = server;
  },
};
