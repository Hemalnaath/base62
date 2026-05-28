import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protected full analytics retrieval
router.get('/:id/analytics', authMiddleware, analyticsController.getAnalytics);

export default router;
