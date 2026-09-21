import express from 'express';
import {
  getAllDonations,
  getDonationById,
  createDonation,
  updateDonationStatus,
  deleteDonation,
} from '../models/donation.js';

const router = express.Router();

/**
 * GET /api/donations
 * List all donations, priority-sorted, with a computed `tier` field on each.
 * Supports optional `?status=pending|accepted|delivered` query parameter.
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const donations = await getAllDonations(status || null);
    res.json({
      success: true,
      count: donations.length,
      donations,
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving donations', error: error.message });
  }
});

/**
 * GET /api/donations/:id
 * Retrieve a single donation by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const donation = await getDonationById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    res.json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving donation', error: error.message });
  }
});

/**
 * POST /api/donations
 * Create a new donation with:
 * - donor: string
 * - foodType: string
 * - quantity: number (servings)
 * - expiryHours or hoursLeft: number (hours until expiry)
 */
router.post('/', async (req, res) => {
  try {
    const { donor, foodType, quantity, expiryHours, hoursLeft } = req.body;

    if (!donor || !foodType) {
      return res.status(400).json({
        success: false,
        message: 'Both "donor" name and "foodType" description are required.',
      });
    }

    const hours = hoursLeft !== undefined ? hoursLeft : expiryHours;
    if (hours === undefined || hours === null || Number(hours) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A positive expiry window (hoursLeft/expiryHours) is required.',
      });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number of servings.',
      });
    }

    const newDonation = await createDonation({
      donor,
      foodType,
      quantity: qty,
      hoursLeft: Number(hours),
    });

    res.status(201).json({
      success: true,
      message: 'Donation created and matched for priority triage successfully.',
      donation: newDonation,
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/donations/:id
 * Update donation status ("accepted" | "delivered" | "pending")
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Field "status" is required ("accepted" or "delivered").',
      });
    }

    const updated = await updateDonationStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    res.json({
      success: true,
      message: `Donation status successfully updated to "${status}".`,
      donation: updated,
    });
  } catch (error) {
    console.error('Error updating donation:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/donations/:id
 * Remove a donation
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteDonation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Donation not found or already removed' });
    }

    res.json({
      success: true,
      message: 'Donation removed successfully.',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({ success: false, message: 'Server error deleting donation', error: error.message });
  }
});

export default router;
