import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: [true, 'Facility is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    date: {
      type: Date,
      required: [true, 'Booking date is required'],
    },
    timeslots: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Timeslot',
      },
    ],
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true,
    },
    eventType: {
      type: String,
      enum: ['seminar', 'workshop', 'conference', 'meeting', 'sports', 'cultural', 'academic', 'other'],
      required: true,
    },
    expectedAttendees: {
      type: Number,
      min: [1, 'Expected attendees must be at least 1'],
    },
    equipmentRequired: [
      {
        type: String,
        trim: true,
      },
    ],
    specialRequests: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: {
      type: String,
      trim: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
bookingSchema.index({ facilityId: 1, date: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ status: 1, date: 1 });
bookingSchema.index({ date: 1 });

// Validation: Check if date is in the future
bookingSchema.pre('save', function (next) {
  if (this.isNew && this.date < new Date()) {
    return next(new Error('Booking date must be in the future'));
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
