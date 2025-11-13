import express from 'express';
import {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  approveBooking,
  rejectBooking,
  getMyBookings,
  getPendingBookings,
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protected routes for authenticated operations
router.get('/my-bookings', protect, getMyBookings);
router.post('/', protect, createBooking);
router.put('/:id', protect, updateBooking);
router.delete('/:id', protect, cancelBooking);

// Admin-only routes (place BEFORE param routes to avoid being swallowed)
router.get('/pending/all', protect, authorize('admin'), getPendingBookings);
router.put('/:id/approve', protect, authorize('admin'), approveBooking);
router.put('/:id/reject', protect, authorize('admin'), rejectBooking);

// Public (or authenticated if you want) listing/detail routes.
// NOTE: keep these last so '/pending/all' and '/:id/approve' resolve correctly.
// Make them public so calendar (unauthenticated) can show approved bookings.
// If you want them protected instead, add `protect` back here.
router.get('/', getBookings);        // <-- public listing (controller defaults to approved for unauthenticated)
router.get('/:id', getBooking);      // <-- public single booking view (controller enforces requester ownership where needed)

export default router;
