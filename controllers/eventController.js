const Event = require('../models/Event');
const Followup = require('../models/Followup');
const moment = require('moment');

// @desc    Create event
// @route   POST /api/events
exports.createEvent = async (req, res) => {
  try {
    const {
      title, description, type, date, endDate, time,
      location, meetingLink, reminderTime, attendees
    } = req.body;

    const event = new Event({
      title,
      description,
      type,
      date,
      endDate: endDate || null,
      time: time || null,
      location,
      meetingLink: meetingLink || '',
      reminderTime: reminderTime || 60,
      createdBy: req.user.id
    });

    // Add attendees if provided
    if (attendees && attendees.length > 0) {
      for (const attendeeId of attendees) {
        const followup = await Followup.findById(attendeeId);
        if (followup) {
          event.attendees.push({
            user: followup._id,
            name: followup.name,
            phone: followup.phone,
            status: 'invited'
          });
        }
      }
    }

    await event.save();

    res.status(201).json({
      success: true,
      data: event,
      message: `Event "${title}" created successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all events
// @route   GET /api/events
exports.getEvents = async (req, res) => {
  try {
    const { type, status, startDate, endDate } = req.query;
    let query = { createdBy: req.user.id };
    
    if (type && type !== 'all') query.type = type;
    
    if (status === 'upcoming') {
      query.date = { $gte: new Date() };
    } else if (status === 'past') {
      query.date = { $lt: new Date() };
    }
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    
    const events = await Event.find(query)
      .sort({ date: 1 })
      .populate('attendees.user', 'name phone');
    
    res.json({
      success: true,
      data: events,
      total: events.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees.user', 'name phone category');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    RSVP to event
// @route   PUT /api/events/:id/rsvp
exports.rsvpToEvent = async (req, res) => {
  try {
    const { attendeeId, status, notes } = req.body;
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const attendee = event.attendees.id(attendeeId);
    if (!attendee) {
      return res.status(404).json({
        success: false,
        message: 'Attendee not found'
      });
    }
    
    attendee.status = status;
    attendee.rsvpAt = new Date();
    
    await event.save();
    
    res.json({
      success: true,
      data: event,
      message: `RSVP updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add attendee to event
// @route   POST /api/events/:id/attendees
exports.addAttendee = async (req, res) => {
  try {
    const { followupId } = req.body;
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const followup = await Followup.findById(followupId);
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    event.attendees.push({
      user: followup._id,
      name: followup.name,
      phone: followup.phone,
      status: 'invited'
    });
    
    await event.save();
    
    res.json({
      success: true,
      data: event,
      message: `${followup.name} added to event`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    await event.deleteOne();
    
    res.json({
      success: true,
      message: `Event "${event.title}" deleted`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
