/**
 * Route table. Every URL the client can reach is listed here, which
 * makes this file the map between the View and the Controllers.
 */
import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import jobRoutes from './jobRoutes.js';
import availabilityRoutes from './availabilityRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import requestRoutes from './requestRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, service: "Andoy's Enterprises API", time: new Date().toISOString() })
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/jobs', jobRoutes);
router.use('/availability', availabilityRoutes);
router.use('/notifications', notificationRoutes);
router.use('/requests', requestRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
