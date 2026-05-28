import { Router } from 'express';
import { authController } from '../controllers/authController';
import { signupValidator, loginValidator } from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Rate limited signup and login routes
router.post('/signup', authLimiter, signupValidator, authController.signup);
router.post('/login', authLimiter, loginValidator, authController.login);

// Token rotational route (requires refreshToken inside body)
router.post('/refresh', authController.refresh);

// Log out active credentials
router.post('/logout', authMiddleware, authController.logout);

export default router;
