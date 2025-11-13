// controllers/bookings.js
import Booking from '../models/Booking.js';
import Timeslot from '../models/Timeslot.js';
import Facility from '../models/Facility.js';
import { sendEmail } from '../utils/email.js';

/**
 * Helpers
 */
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const timeToMinutes = (timeStr) => {
  const [hours = 0, minutes = 0] = (timeStr || '').split(':').map(Number);
  return hours * 60 + minutes;
};

const timeRangesOverlap = (start1, end1, start2, end2) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
};

/**
 * findOrCreateTimeslot:
 * - ensures no overlapping booked/pending timeslots exist
 * - creates an 'available' timeslot if none exists
 * - returns the timeslot doc or null (if conflict)
 */
const findOrCreateTimeslot = async (facilityId, date, startTime, endTime) => {
  const normalizedDate = normalizeDate(date);

  // find identical timeslot
  let timeslot = await Timeslot.findOne({
    facilityId,
    date: normalizedDate,
    startTime,
    endTime,
  });

  // if found but not available => conflict
  if (timeslot && (timeslot.isBooked || timeslot.status !== 'available')) {
    return null;
  }

  // if not found, check for overlaps with booked/pending timeslots
  if (!timeslot) {
    const bookedOrPending = await Timeslot.find({
      facilityId,
      date: normalizedDate,
      $or: [
        { isBooked: true },
        { status: { $in: ['pending', 'booked'] } }
      ],
    });

    for (const b of bookedOrPending) {
      if (timeRangesOverlap(startTime, endTime, b.startTime, b.endTime)) {
        return null;
      }
    }

    // create a new available timeslot
    timeslot = await Timeslot.create({
      facilityId,
      date: normalizedDate,
      startTime,
      endTime,
      isBooked: false,
      status: 'available',
    });
  }

  return timeslot;
};

/**
 * GET /api/bookings
 * Flexible listing:
 * - facilityId, status, startDate, endDate
 * - my=true (bookings by current user)
 * - adminOnly=true (bookings for facilities this admin manages)
 * - all=true (do not implicitly scope results)
 */
export const getBookings = async (req, res, next) => {
  try {
    const { facilityId, status, startDate, endDate, my, adminOnly, all } = req.query;
    const query = {};

    // date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // facility filter
    if (facilityId) {
      query.facilityId = facilityId;
    }

    // status can be comma-separated
    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) query.status = statuses[0];
      else if (statuses.length > 1) query.status = { $in: statuses };
    }

    // "my" bookings
    if (my === 'true') {
      if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Authentication required for my bookings' });
      query.userId = req.user.id;
    } else if (adminOnly === 'true') {
      // admin-only: bookings for facilities the admin manages
      if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Authentication required for adminOnly bookings' });

      // normalize managedFacilities if present on req.user else query DB
      let managedIds = [];
      if (Array.isArray(req.user.managedFacilities) && req.user.managedFacilities.length) {
        managedIds = req.user.managedFacilities.map(f => (typeof f === 'object' ? (f._id || f.id) : f));
      } else {
        const facs = await Facility.find({ adminId: req.user.id }).select('_id');
        managedIds = facs.map(f => String(f._id));
      }

      if (!managedIds.length) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }

      if (query.facilityId) {
        if (!managedIds.includes(String(query.facilityId))) {
          return res.status(200).json({ success: true, count: 0, data: [] });
        }
      } else {
        query.facilityId = { $in: managedIds };
      }
    } else {
      // not my, not adminOnly: if unauthenticated and no status requested, default to approved
      const isAuthenticated = !!(req.user && req.user.id);
      if (!isAuthenticated && !status && all !== 'true') {
        query.status = 'approved';
      }
      // otherwise allow broader results
    }

    const bookings = await Booking.find(query)
      .populate('facilityId', 'name type location capacity amenities equipment adminId')
      .populate('userId', 'name email phone department')
      .populate('approvedBy', 'name email')
      .populate('timeslots')
      .sort({ date: -1 });

    return res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/:id
 */
export const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('facilityId')
      .populate('userId', 'name email phone department')
      .populate('approvedBy', 'name email')
      .populate('timeslots');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // If requester, ensure ownership
    if (req.user && req.user.role === 'requester') {
      if (!booking.userId || String(booking.userId._id || booking.userId) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this booking' });
      }
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/bookings
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      facilityId,
      timeslots,   // array of IDs or array of objects
      timeRanges,  // array of { startTime, endTime }
      purpose,
      eventType,
      expectedAttendees,
      equipmentRequired,
      specialRequests,
      date,        // expected date string or date object
    } = req.body;

    if (!facilityId) return res.status(400).json({ success: false, message: 'facilityId is required' });
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Authentication required to create booking' });

    // fetch facility and admin info
    const facility = await Facility.findById(facilityId).populate('adminId', 'name email');
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });
    if (facility.isActive === false) return res.status(400).json({ success: false, message: 'This facility is currently inactive' });

    const bookingDate = date ? normalizeDate(date) : normalizeDate(new Date());

    // Accept timeRanges OR timeslots (IDs or objects)
    const ranges = Array.isArray(timeRanges) && timeRanges.length ? timeRanges
      : Array.isArray(timeslots) && timeslots.length && typeof timeslots[0] === 'object' ? timeslots
      : [];

    const idOnlySlots = Array.isArray(timeslots) && timeslots.length && typeof timeslots[0] === 'string' ? timeslots : [];

    let timeslotIds = [];
    const timeslotDocs = [];

    // Handle ranges or object-format timeslots
    if (ranges.length > 0) {
      for (const r of ranges) {
        if (!r.startTime || !r.endTime) {
          return res.status(400).json({ success: false, message: 'Each time range must include startTime and endTime' });
        }

        const ts = await findOrCreateTimeslot(facilityId, bookingDate, r.startTime, r.endTime);
        if (!ts) {
          return res.status(400).json({ success: false, message: `Timeslot ${r.startTime}-${r.endTime} conflicts with existing booking` });
        }

        timeslotIds.push(ts._id);
        timeslotDocs.push(ts);
      }
    }

    // Handle ID-only slots
    if (idOnlySlots.length > 0) {
      const fetched = await Timeslot.find({ _id: { $in: idOnlySlots }, facilityId, date: bookingDate });
      if (fetched.length !== idOnlySlots.length) {
        return res.status(400).json({ success: false, message: 'One or more timeslot IDs are invalid for this facility/date' });
      }

      const conflict = fetched.find(t => t.isBooked || t.status !== 'available');
      if (conflict) {
        return res.status(400).json({ success: false, message: 'One or more timeslots are already booked or unavailable' });
      }

      fetched.forEach(t => {
        timeslotIds.push(t._id);
        timeslotDocs.push(t);
      });
    }

    if (timeslotIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one timeslot or time range is required' });
    }

    // Create booking document
    const requiresApproval = !!(facility.bookingRules && facility.bookingRules.requiresApproval);
    const booking = await Booking.create({
      facilityId,
      userId: req.user.id,
      date: bookingDate,
      timeslots: timeslotIds,
      purpose,
      eventType,
      expectedAttendees,
      equipmentRequired,
      specialRequests,
      status: requiresApproval ? 'pending' : 'approved',
    });

    // Update timeslots status and bookingId
    await Timeslot.updateMany(
      { _id: { $in: timeslotIds } },
      {
        isBooked: true,
        bookingId: booking._id,
        status: requiresApproval ? 'pending' : 'booked',
      }
    );

    // NOTE: Removed admin notification here. Per request, we will send email only on approval/rejection,
    // so do not notify admin at booking submission time.

    const populated = await Booking.findById(booking._id).populate('facilityId').populate('timeslots');

    return res.status(201).json({ success: true, message: 'Booking created successfully', data: populated });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/bookings/:id
 * update allowed fields for pending bookings (requester allowed)
 */
export const updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // requester cannot update other's booking
    if (req.user && req.user.role === 'requester' && String(booking.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this booking' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be updated' });
    }

    const allowed = ['purpose', 'eventType', 'expectedAttendees', 'equipmentRequired', 'specialRequests'];
    const updates = {};
    Object.keys(req.body).forEach(k => { if (allowed.includes(k)) updates[k] = req.body[k]; });

    booking = await Booking.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('facilityId')
      .populate('timeslots');

    return res.status(200).json({ success: true, message: 'Booking updated successfully', data: booking });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/bookings/:id
 * cancel booking (requester can cancel own; admin can cancel)
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (req.user && req.user.role === 'requester' && String(booking.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'Cancelled by user';
    await booking.save();

    await Timeslot.updateMany(
      { bookingId: booking._id },
      { isBooked: false, bookingId: null, status: 'available' }
    );

    return res.status(200).json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/bookings/:id/approve
 * Admin approves a pending booking.
 * Admin must be manager of facility (or you can adjust to super-admin logic).
 */
export const approveBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId').populate('facilityId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending bookings can be approved' });

    // authorization: admin must manage this facility (if role present)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // if facility has adminId and it's not this admin, deny
    if (booking.facilityId && booking.facilityId.adminId && String(booking.facilityId.adminId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to approve bookings for this facility' });
    }

    booking.status = 'approved';
    booking.approvedBy = req.user.id;
    booking.approvedAt = new Date();
    booking.notes = req.body.notes || booking.notes;
    await booking.save();

    await Timeslot.updateMany({ bookingId: booking._id }, { status: 'booked' });

    try {
      if (booking.userId && booking.userId.email) {
        // send minimal plain-text email body "Request accepted"
        await sendEmail({
          to: booking.userId.email,
          subject: 'Booking Approved',
          text: 'Request accepted'
        });
      }
    } catch (mailErr) {
      console.warn('Warning: failed to send approval email', mailErr);
    }

    return res.status(200).json({ success: true, message: 'Booking approved successfully', data: booking });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/bookings/:id/reject
 * Admin rejects a pending booking.
 */
export const rejectBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId').populate('facilityId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending bookings can be rejected' });

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    if (booking.facilityId && booking.facilityId.adminId && String(booking.facilityId.adminId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to reject bookings for this facility' });
    }

    booking.status = 'rejected';
    booking.rejectionReason = req.body.reason || 'No reason provided';
    booking.approvedBy = req.user.id;
    booking.rejectedAt = new Date();
    await booking.save();

    await Timeslot.updateMany(
      { bookingId: booking._id },
      { isBooked: false, bookingId: null, status: 'available' }
    );

    try {
      if (booking.userId && booking.userId.email) {
        // send minimal plain-text email body "Request rejected"
        await sendEmail({
          to: booking.userId.email,
          subject: 'Booking Rejected',
          text: 'Request rejected'
        });
      }
    } catch (mailErr) {
      console.warn('Warning: failed to send rejection email', mailErr);
    }

    return res.status(200).json({ success: true, message: 'Booking rejected successfully', data: booking });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/my-bookings
 */
export const getMyBookings = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Authentication required' });

    const bookings = await Booking.find({ userId: req.user.id })
      .populate('facilityId', 'name type location')
      .populate('timeslots')
      .sort({ date: -1 });

    return res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/pending/all
 * Admin-only: pending bookings for facilities admin manages
 */
export const getPendingBookings = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const facilities = await Facility.find({ adminId: req.user.id }).select('_id');
    const facilityIds = facilities.map(f => f._id);

    if (!facilityIds.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const bookings = await Booking.find({ status: 'pending', facilityId: { $in: facilityIds } })
      .populate('facilityId', 'name type location')
      .populate('userId', 'name email phone department')
      .populate('timeslots')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    return next(error);
  }
};
