import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { home, managerDashboard, myDashboard, calendar } from '../controllers/dashboardController.js';

const router = Router();
router.use(protect);

router.get('/home', home);
router.get('/calendar', calendar);
router.get('/logs', myDashboard);
router.get('/manager', authorize('manager'), managerDashboard);

export default router;
