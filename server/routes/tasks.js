const express = require('express');
const { body } = require('express-validator');
const {
  createTask, getTasks, getTask,
  updateTask, deleteTask, getDashboardStats,
  addComment, getComments, deleteComment
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/dashboard/stats', getDashboardStats);

router.route('/')
  .get(getTasks)
  .post([
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('project').notEmpty().withMessage('Project ID is required')
  ], createTask);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

router.post('/:id/comments', addComment);
router.get('/:id/comments', getComments);
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;
