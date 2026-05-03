const express = require('express');
const { body } = require('express-validator');
const { signup, login, getMe, getUsers, updateProfile, changePassword, getUserProfile, changeUserRole } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], signup);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/me/password', protect, changePassword);
router.get('/users', protect, getUsers);
router.get('/users/:id', protect, getUserProfile);
router.put('/users/:id/role', protect, authorize('admin'), changeUserRole);

module.exports = router;
