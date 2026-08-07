import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { summaryReport } from '../controllers/reportController.js';

const router = Router();
router.use(protect, authorize('manager'));

router.get('/summary', summaryReport);

export default router;
