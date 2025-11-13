import Timeslot from '../models/Timeslot.js';

// Helper function to normalize date to start of day in UTC
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// @desc    Get timeslots
// @route   GET /api/timeslots
// @access  Public
export const getTimeslots = async (req, res, next) => {
  try {
    const { facilityId, date, startDate, endDate } = req.query;

    let query = {};

    if (facilityId) {
      query.facilityId = facilityId;
    }

    if (date) {
      const queryDate = normalizeDate(date);
      const nextDay = new Date(queryDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      
      query.date = {
        $gte: queryDate,
        $lt: nextDay,
      };
    } else if (startDate && endDate) {
      query.date = {
        $gte: normalizeDate(startDate),
        $lte: normalizeDate(endDate),
      };
    }

    const timeslots = await Timeslot.find(query)
      .populate('facilityId', 'name type')
      .populate('bookingId')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: timeslots.length,
      data: timeslots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create timeslot
// @route   POST /api/timeslots
// @access  Private/Admin
export const createTimeslot = async (req, res, next) => {
  try {
    const { facilityId, date, startTime, endTime } = req.body;

    // Check if timeslot already exists
    const existingSlot = await Timeslot.findOne({
      facilityId,
      date: new Date(date),
      startTime,
      endTime,
    });

    if (existingSlot) {
      return res.status(400).json({
        success: false,
        message: 'This timeslot already exists',
      });
    }

    const timeslot = await Timeslot.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Timeslot created successfully',
      data: timeslot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update timeslot
// @route   PUT /api/timeslots/:id
// @access  Private/Admin
export const updateTimeslot = async (req, res, next) => {
  try {
    let timeslot = await Timeslot.findById(req.params.id);

    if (!timeslot) {
      return res.status(404).json({
        success: false,
        message: 'Timeslot not found',
      });
    }

    // Don't allow updating booked timeslots
    if (timeslot.isBooked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a booked timeslot',
      });
    }

    timeslot = await Timeslot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Timeslot updated successfully',
      data: timeslot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete timeslot
// @route   DELETE /api/timeslots/:id
// @access  Private/Admin
export const deleteTimeslot = async (req, res, next) => {
  try {
    const timeslot = await Timeslot.findById(req.params.id);

    if (!timeslot) {
      return res.status(404).json({
        success: false,
        message: 'Timeslot not found',
      });
    }

    // Don't allow deleting booked timeslots
    if (timeslot.isBooked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a booked timeslot',
      });
    }

    await timeslot.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Timeslot deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check availability for multiple timeslots
// @route   POST /api/timeslots/check-availability
// @access  Public
export const checkAvailability = async (req, res, next) => {
  try {
    const { facilityId, date, timeslotIds } = req.body;

    if (!facilityId || !date || !timeslotIds || !Array.isArray(timeslotIds)) {
      return res.status(400).json({
        success: false,
        message: 'facilityId, date, and timeslotIds array are required',
      });
    }

    const timeslots = await Timeslot.find({
      _id: { $in: timeslotIds },
      facilityId,
      date: new Date(date),
    });

    const availability = timeslots.map((slot) => ({
      id: slot._id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: !slot.isBooked && slot.status === 'available',
      status: slot.status,
    }));

    const allAvailable = availability.every((slot) => slot.isAvailable);

    res.status(200).json({
      success: true,
      data: {
        allAvailable,
        slots: availability,
      },
    });
  } catch (error) {
    next(error);
  }
};
