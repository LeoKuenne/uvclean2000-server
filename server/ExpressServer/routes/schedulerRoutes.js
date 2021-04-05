const express = require('express');
const ScheduleEvent = require('../../schedule/module/ScheduleEvent');
const Action = require('../../schedule/module/Action');
const Time = require('../../schedule/module/Time');
const MainLogger = require('../../Logger.js').logger;

const logger = MainLogger.child({ service: 'ExpressSchedulerAPI' });

const router = express.Router();
let agenda = null;
let eventBus = null;

router.get('/events', async (req, res, next) => {
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

router.get('/event', async (req, res, next) => {
  logger.info('Got get on event route. Request: %o', req.body);

  try {
    const event = await agenda.getEvent(req.body.name);

    return res.status(201).send(event);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

    if (error.message === 'The event exists mulipletimes or does not exists') { return res.sendStatus(404); }

    return res.status(401).send({
      msg: error.message,
    });
  }
});

router.post('/event', async (req, res, next) => {
  logger.info('Got post on event route. Request: %o', req.body);

  try {
    const scheduleEvent = new ScheduleEvent(req.body.name, new Time(req.body.time.days,
      new Date(req.body.time.timeofday)),
    req.body.actions.map((action) => new Action(action.group, action.propertie, action.newValue)));
    await agenda.addEvent(scheduleEvent);

    return res.status(201).send(scheduleEvent);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

    if (error.message === 'The event exists mulipletimes or does not exists') { return res.status(404).send({ msg: error.message }); }

    return res.status(401).send({
      msg: error.message,
    });
  }
});

router.delete('/event', async (req, res, next) => {
  logger.info('Got delete on event route. Request: %o', req.body);

  try {
    await agenda.deleteEvent(new ScheduleEvent(req.body.name, new Time([], new Date()), []));

    return res.sendStatus(201);
  } catch (error) {
    eventBus.emit('error', { service: 'ExpressServer', error });

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
