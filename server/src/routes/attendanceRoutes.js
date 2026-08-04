import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  clockIn,
  clockOut,
  todayForMe,
  listAttendance,
  updateAttendance,
  attendanceSummary,
} from '../controllers/attendanceController.js';

const router = Router();
router.use(protect);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', todayForMe);
router.get('/', listAttendance);
router.get('/summary', authorize('manager'), attendanceSummary);
router.patch('/:id', authorize('manager'), updateAttendance);

export default router;
