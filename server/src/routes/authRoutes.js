import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { signup, login, me, changePassword } from '../controllers/authController.js';

const router = Router();

router.post(
  '/signup',
  [
    body('fullName').trim().notEmpty().withMessage('Enter your full name'),
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Use at least 8 characters'),
    body('phone').optional().trim(),
  ],
  validate,
  signup
);

router.post(
  '/login',
  [body('email').isEmail().withMessage('Enter a valid email'), body('password').notEmpty().withMessage('Enter your password')],
  validate,
  login
);

router.get('/me', protect, me);

router.patch(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Enter your current password'),
    body('newPassword').isLength({ min: 8 }).withMessage('Use at least 8 characters'),
  ],
  validate,
  changePassword
);

export default router;
