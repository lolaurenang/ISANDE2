import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  listAvailability,
  setAvailability,
  setAvailabilityBulk,
  removeAvailability,
  availabilityRoster,
} from '../controllers/availabilityController.js';

const router = Router();
router.use(protect);

router.get('/', listAvailability);
router.get('/roster', authorize('manager'), availabilityRoster);

router.post(
  '/',
  [body('workDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('workDate must be YYYY-MM-DD')],
  validate,
  setAvailability
);

router.post('/bulk', setAvailabilityBulk);
router.delete('/:workDate', removeAvailability);

export default router;
