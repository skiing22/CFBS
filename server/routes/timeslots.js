import express from 'express';
import {
  getTimeslots,
  createTimeslot,
  updateTimeslot,
  deleteTimeslot,
  checkAvailability,
} from '../controllers/timeslotController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getTimeslots);
router.post('/check-availability', checkAvailability);

// Protected routes - Admin only
router.post('/', protect, authorize('admin'), createTimeslot);
router.put('/:id', protect, authorize('admin'), updateTimeslot);
router.delete('/:id', protect, authorize('admin'), deleteTimeslot);

export default router;
