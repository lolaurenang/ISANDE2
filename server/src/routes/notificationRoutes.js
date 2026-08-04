import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  listMyNotifications,
  markRead,
  markAllRead,
  broadcast,
} from '../controllers/notificationController.js';

const router = Router();
router.use(protect);

router.get('/', listMyNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

router.post(
  '/broadcast',
  authorize('manager'),
  [body('title').trim().notEmpty(), body('message').trim().notEmpty()],
  validate,
  broadcast
);

export default router;
