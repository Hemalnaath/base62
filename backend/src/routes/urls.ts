import { Router } from 'express';
import multer from 'multer';
import { urlController } from '../controllers/urlController';
import { authMiddleware } from '../middleware/authMiddleware';
import { urlValidator } from '../middleware/validator';
import { createUrlLimiter } from '../middleware/rateLimiter';

const router = Router();

// Setup memory storage for PapaParse processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 // cap uploading files at 1MB
  }
});

// Protected CRUD URL operations
router.get('/', authMiddleware, urlController.listUrls);
router.post('/', authMiddleware, createUrlLimiter, urlValidator, urlController.createUrl);
router.get('/:id', authMiddleware, urlController.getUrl);
router.patch('/:id', authMiddleware, urlController.patchUrl);
router.delete('/:id', authMiddleware, urlController.deleteUrl);

// CSV Bulk loading
router.post('/bulk', authMiddleware, upload.single('file'), urlController.bulkImport);

// Public Stats (Unauthenticated - checks is_public === 1)
router.get('/:shortCode/public', urlController.getPublicStats);

export default router;
