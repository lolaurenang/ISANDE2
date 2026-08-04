import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  listJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  logWork,
  suggestAssignees,
} from '../controllers/serviceJobController.js';

const router = Router();
router.use(protect);

router.get('/', listJobs);
router.get('/suggest', authorize('manager'), suggestAssignees);
router.get('/:id', getJob);

router.post(
  '/',
  authorize('manager'),
  [
    body('title').trim().notEmpty().withMessage('Give the job a title'),
    body('startDate').isISO8601().withMessage('Pick a start date'),
    body('endDate').isISO8601().withMessage('Pick an end date'),
  ],
  validate,
  createJob
);

router.patch('/:id', updateJob);
router.delete('/:id', authorize('manager'), deleteJob);

router.post(
  '/:id/logs',
  [body('work').trim().notEmpty().withMessage('Describe what you worked on')],
  validate,
  logWork
);

export default router;
