import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect, authorize, selfOrManager } from '../middleware/auth.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
} from '../controllers/userController.js';

const router = Router();
router.use(protect);

router.get('/', listUsers);
router.get('/:id', selfOrManager(), getUser);

router.post(
  '/',
  authorize('manager'),
  [
    body('fullName').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('role').optional().isIn(['manager', 'mechanic', 'staff']),
  ],
  validate,
  createUser
);

router.patch('/:id', selfOrManager(), updateUser);
router.delete('/:id', authorize('manager'), deactivateUser);

export default router;
