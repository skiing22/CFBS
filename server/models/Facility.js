import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Facility name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Facility type is required'],
      enum: ['seminar_hall', 'auditorium', 'sports_ground', 'guest_house', 'conference_room', 'laboratory', 'Others'],
    },
    location: {
      building: {
        type: String,
        required: true,
      },
      floor: String,
      room: String,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    equipment: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
        available: {
          type: Boolean,
          default: true,
        },
      },
    ],
    images: [String],
    description: {
      type: String,
      trim: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Facility admin is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bookingRules: {
      minBookingHours: {
        type: Number,
        default: 1,
      },
      maxBookingHours: {
        type: Number,
        default: 8,
      },
      advanceBookingDays: {
        type: Number,
        default: 30,
      },
      requiresApproval: {
        type: Boolean,
        default: true,
      },
    },
    availability: {
      monday: { available: { type: Boolean, default: true }, hours: String },
      tuesday: { available: { type: Boolean, default: true }, hours: String },
      wednesday: { available: { type: Boolean, default: true }, hours: String },
      thursday: { available: { type: Boolean, default: true }, hours: String },
      friday: { available: { type: Boolean, default: true }, hours: String },
      saturday: { available: { type: Boolean, default: false }, hours: String },
      sunday: { available: { type: Boolean, default: false }, hours: String },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
facilitySchema.index({ type: 1, isActive: 1 });
facilitySchema.index({ adminId: 1 });
facilitySchema.index({ name: 'text', description: 'text' });

const Facility = mongoose.model('Facility', facilitySchema);

export default Facility;
