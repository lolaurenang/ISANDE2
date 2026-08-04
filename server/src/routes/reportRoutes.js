import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { listReportTypes, runReport } from '../controllers/reportController.js';

const router = Router();

// Reports expose the whole shop's data, so they are manager-only.
router.use(protect, authorize('manager'));

router.get('/', listReportTypes);
router.get('/:type', runReport);

export default router;
