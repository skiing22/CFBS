import Facility from '../models/Facility.js';
import Booking from '../models/Booking.js';
import Timeslot from '../models/Timeslot.js';
import User from '../models/User.js'; // ensure this path is correct for your project

// @desc    Get facilities
// @route   GET /api/facilities
// @access  Public (returns all facilities by default).
//          If ?adminOnly=true is passed, returns only facilities where adminId === req.user.id (requires auth).
export const getFacilities = async (req, res, next) => {
  try {
    const { type, isActive, search, adminOnly } = req.query;

    let query = {};

    if (type) {
      query.type = type;
    }

    if (typeof isActive !== 'undefined') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$text = { $search: search };
    }

    // If caller explicitly requested admin-only results (adminOnly=true),
    // only return facilities owned by the authenticated user.
    // This is intended for admin management UI.
    if (adminOnly === 'true') {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Authentication required for admin-only facilities' });
      }
      // restrict results to facilities where adminId === req.user.id
      query.adminId = req.user.id;
    }

    const facilities = await Facility.find(query)
      .populate('adminId', 'name email phone')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: facilities.length,
      data: facilities,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get single facility
// @route   GET /api/facilities/:id
// @access  Public
export const getFacility = async (req, res, next) => {
  try {
    const facility = await Facility.findById(req.params.id).populate('adminId', 'name email phone');

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: facility,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Create new facility
// @route   POST /api/facilities
// @access  Private/Admin
export const createFacility = async (req, res, next) => {
  try {
    // If adminId not provided, set to logged-in user (if available)
    if (!req.body.adminId && req.user && req.user.id) {
      req.body.adminId = req.user.id;
    }

    const facility = await Facility.create(req.body);

    // Try to keep user.managedFacilities in sync (optional but helpful for admin UI)
    // Do not fail the main request if this update errors.
    try {
      if (req.user && req.user.id) {
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { managedFacilities: facility._id } });
      }
    } catch (uErr) {
      // Log and continue
      console.warn('Warning: failed to update user.managedFacilities', uErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      data: facility,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update facility
// @route   PUT /api/facilities/:facilityId
// @access  Private/Admin
export const updateFacility = async (req, res, next) => {
  try {
    const facility = await Facility.findByIdAndUpdate(req.params.facilityId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Facility updated successfully',
      data: facility,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete facility
// @route   DELETE /api/facilities/:facilityId
// @access  Private/Admin
export const deleteFacility = async (req, res, next) => {
  try {
    const facility = await Facility.findById(req.params.facilityId);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found',
      });
    }

    // Check for existing (future) bookings that are pending or approved
    const bookingsCount = await Booking.countDocuments({
      facilityId: req.params.facilityId,
      date: { $gte: new Date() },
      status: { $in: ['pending', 'approved'] },
    });

    if (bookingsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete facility with active or pending bookings',
      });
    }

    await facility.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Facility deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get facility availability
// @route   GET /api/facilities/:id/availability
// @access  Public
export const getFacilityAvailability = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found',
      });
    }

    // Get all bookings for this facility in the date range
    const bookings = await Booking.find({
      facilityId: req.params.id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      status: { $in: ['pending', 'approved'] },
    }).populate('timeslots');

    // Get all timeslots for this facility in the date range
    const timeslots = await Timeslot.find({
      facilityId: req.params.id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        facility,
        bookings,
        timeslots,
      },
    });
  } catch (error) {
    return next(error);
  }
};
