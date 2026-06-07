const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  rsvpToEvent,
  addAttendee,
  deleteEvent
} = require('../controllers/eventController');

router.use(protect);

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.put('/:id/rsvp', rsvpToEvent);
router.post('/:id/attendees', addAttendee);

router.route('/:id')
  .get(getEventById)
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;
