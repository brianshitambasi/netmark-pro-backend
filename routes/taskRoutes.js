const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTask,
  getTasks,
  updateTaskStatus,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

router.use(protect);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.put('/:id/status', updateTaskStatus);

router.route('/:id')
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;
