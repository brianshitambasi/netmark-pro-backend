const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createGoal,
  getGoals,
  getGoalById,
  updateGoalProgress,
  updateGoal,
  deleteGoal,
  getGoalSuggestions
} = require('../controllers/goalController');

router.use(protect);

// Suggestions
router.get('/suggestions', getGoalSuggestions);

// Main CRUD
router.route('/')
  .get(getGoals)
  .post(createGoal);

// Progress update
router.put('/:id/progress', updateGoalProgress);

// Individual goal routes
router.route('/:id')
  .get(getGoalById)
  .put(updateGoal)
  .delete(deleteGoal);

module.exports = router;
