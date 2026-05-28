import { Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';
import { urlService } from '../services/urlService';

export const analyticsController = {
  /**
   * Delivers full visual/informational metrics breakdowns for a specific short link.
   * Path: GET /api/urls/:id/analytics
   */
  async getAnalytics(req: any, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const urlId = parseInt(req.params.id);

    if (isNaN(urlId)) {
      return res.status(400).json({ error: 'Valid URL ID parameter is required.' });
    }

    try {
      // 1. Verify URL details exist and ownership matches calling user
      const record = await urlService.getById(urlId);
      if (!record) {
        return res.status(404).json({ error: 'URL details could not be found.' });
      }

      if (record.user_id !== userId) {
        return res.status(401).json({ error: 'You are unauthorized to view analytics for this URL.' });
      }

      // 2. Aggregate statistics
      const stats = await analyticsService.getUrlAnalytics(urlId);

      return res.status(200).json(stats);
    } catch (error) {
      return next(error);
    }
  }
};
export default analyticsController;
