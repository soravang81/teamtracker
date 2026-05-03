const express = require('express');
const { body } = require('express-validator');
const {
  createProject, getProjects, getProject,
  updateProject, deleteProject, addMember, removeMember,
  changeMemberRole, getProjectActivity
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getProjects)
  .post([
    body('name').trim().notEmpty().withMessage('Project name is required')
  ], createProject);

router.route('/:id')
  .get(getProject)
  .put([
    body('name').optional().trim().notEmpty().withMessage('Project name cannot be empty')
  ], updateProject)
  .delete(deleteProject);

router.post('/:id/members', addMember);
router.post('/:id/members/remove', removeMember);
router.put('/:id/members/role', changeMemberRole);
router.get('/:id/activity', getProjectActivity);

module.exports = router;
