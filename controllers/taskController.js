const Task = require('../models/Task');
const Followup = require('../models/Followup');
const moment = require('moment');

// @desc    Create task
// @route   POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const {
      title, description, type, priority, dueDate,
      relatedModel, relatedId, tags
    } = req.body;

    const task = new Task({
      title,
      description,
      type: type || 'followup',
      priority: priority || 'medium',
      dueDate,
      relatedTo: {
        model: relatedModel || 'none',
        id: relatedId || null
      },
      tags: tags || [],
      createdBy: req.user.id
    });

    await task.save();

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const {
      status, priority, type, date, search,
      page = 1, limit = 50
    } = req.query;

    let query = { createdBy: req.user.id };

    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (type && type !== 'all') query.type = type;

    if (date === 'today') {
      const today = moment().startOf('day');
      const tomorrow = moment().endOf('day');
      query.dueDate = { $gte: today, $lte: tomorrow };
    } else if (date === 'tomorrow') {
      const tomorrow = moment().add(1, 'day').startOf('day');
      const dayAfter = moment().add(1, 'day').endOf('day');
      query.dueDate = { $gte: tomorrow, $lte: dayAfter };
    } else if (date === 'overdue') {
      query.dueDate = { $lt: new Date() };
      query.status = 'pending';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query)
      .sort({ dueDate: 1, priority: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    const summary = {
      pending: await Task.countDocuments({ createdBy: req.user.id, status: 'pending' }),
      completed: await Task.countDocuments({ createdBy: req.user.id, status: 'completed' }),
      overdue: await Task.countDocuments({
        createdBy: req.user.id,
        dueDate: { $lt: new Date() },
        status: 'pending'
      }),
      highPriority: await Task.countDocuments({
        createdBy: req.user.id,
        priority: 'high',
        status: 'pending'
      })
    };

    res.json({
      success: true,
      data: tasks,
      summary,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    }
    
    await task.save();
    
    // If task is related to a followup, update it too
    if (task.relatedTo.model === 'followup' && task.relatedTo.id && status === 'completed') {
      await Followup.findByIdAndUpdate(task.relatedTo.id, {
        $inc: { followupCount: 1 }
      });
    }
    
    res.json({
      success: true,
      data: task,
      message: `Task marked as ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.json({
      success: true,
      data: task,
      message: 'Task updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    await task.deleteOne();
    
    res.json({
      success: true,
      message: 'Task deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
