import mongoose from 'mongoose';

const timeslotSchema = new mongoose.Schema(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: [true, 'Facility is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'],
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    status: {
      type: String,
      enum: ['available', 'pending', 'booked', 'blocked'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
timeslotSchema.index({ facilityId: 1, date: 1, startTime: 1 }, { unique: true });
timeslotSchema.index({ facilityId: 1, date: 1, isBooked: 1 });
timeslotSchema.index({ bookingId: 1 });

// Validation: Ensure end time is after start time
timeslotSchema.pre('save', function (next) {
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }
  next();
});

const Timeslot = mongoose.model('Timeslot', timeslotSchema);

export default Timeslot;
