import express from 'express';
import { getStats } from '../models/donation.js';

const router = express.Router();

/**
 * GET /api/stats
 * Counts per tier (Critical, High, Medium, Expired) + total and status counts
 * for the Admin dashboard and summary metrics.
 */
router.get('/', async (req, res) => {
  try {
    const stats = await getStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving stats', error: error.message });
  }
});

export default router;
