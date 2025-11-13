import express from 'express';
import {
  getFacilities,
  getFacility,
  createFacility,
  updateFacility,
  deleteFacility,
  getFacilityAvailability,
} from '../controllers/facilityController.js';
import { protect, authorize, isFacilityAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', protect, getFacilities);
router.get('/:id', getFacility);
router.get('/:id/availability', getFacilityAvailability);

// Protected routes - Admin only
router.post('/', protect, authorize('admin'), createFacility);
router.put('/:facilityId', protect, authorize('admin'), isFacilityAdmin, updateFacility);
router.delete('/:facilityId', protect, authorize('admin'), isFacilityAdmin, deleteFacility);

export default router;
