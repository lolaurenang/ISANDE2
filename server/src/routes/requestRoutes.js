import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  listRequests,
  createRequest,
  reviewRequest,
  cancelRequest,
} from '../controllers/shiftRequestController.js';

const router = Router();
router.use(protect);

router.get('/', listRequests);

router.post(
  '/',
  [
    body('workDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('workDate must be YYYY-MM-DD'),
    body('reason').trim().notEmpty().withMessage('Say why you need the change'),
  ],
  validate,
  createRequest
);

router.patch('/:id/review', authorize('manager'), reviewRequest);
router.delete('/:id', cancelRequest);

export default router;
