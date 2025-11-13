import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Facility from '../models/Facility.js';
import Booking from '../models/Booking.js';
import Timeslot from '../models/Timeslot.js';

// Load environment variables
dotenv.config();

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@university.edu',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    phone: '+1234567890',
    designation: 'staff',
  },
  {
    name: 'John Doe',
    email: 'john@university.edu',
    password: 'requester123',
    role: 'requester',
    department: 'Computer Science',
    phone: '+1234567891',
    designation: 'faculty',
  },
  {
    name: 'Jane Smith',
    email: 'jane@university.edu',
    password: 'requester123',
    role: 'requester',
    department: 'Mechanical Engineering',
    phone: '+1234567892',
    designation: 'student',
  },
];

const facilities = [
  {
    name: 'Main Auditorium',
    type: 'auditorium',
    location: {
      building: 'Administrative Block',
      floor: 'Ground Floor',
      room: 'A-101',
    },
    capacity: 500,
    amenities: ['Air Conditioning', 'Stage', 'Green Room', 'Sound System'],
    equipment: [
      { name: 'Projector', quantity: 2, available: true },
      { name: 'Microphone', quantity: 4, available: true },
      { name: 'Speakers', quantity: 8, available: true },
    ],
    description: 'Large auditorium suitable for conferences, seminars, and cultural events',
    isActive: true,
  },
  {
    name: 'Conference Room A',
    type: 'conference_room',
    location: {
      building: 'Academic Block',
      floor: '2nd Floor',
      room: 'B-201',
    },
    capacity: 50,
    amenities: ['Air Conditioning', 'Whiteboard', 'WiFi'],
    equipment: [
      { name: 'Projector', quantity: 1, available: true },
      { name: 'Laptop', quantity: 1, available: true },
      { name: 'Conference Phone', quantity: 1, available: true },
    ],
    description: 'Modern conference room with video conferencing facilities',
    isActive: true,
  },
  {
    name: 'Sports Ground',
    type: 'sports_ground',
    location: {
      building: 'Sports Complex',
      floor: 'Outdoor',
      room: 'Field 1',
    },
    capacity: 200,
    amenities: ['Floodlights', 'Seating Area', 'Changing Rooms'],
    equipment: [
      { name: 'Football Goals', quantity: 2, available: true },
      { name: 'Cricket Pitch', quantity: 1, available: true },
    ],
    description: 'Multi-purpose sports ground for various outdoor activities',
    isActive: true,
  },
  {
    name: 'Seminar Hall 1',
    type: 'seminar_hall',
    location: {
      building: 'Academic Block',
      floor: '1st Floor',
      room: 'C-105',
    },
    capacity: 100,
    amenities: ['Air Conditioning', 'WiFi', 'Projector Screen'],
    equipment: [
      { name: 'Projector', quantity: 1, available: true },
      { name: 'Microphone', quantity: 2, available: true },
      { name: 'Laser Pointer', quantity: 1, available: true },
    ],
    description: 'Well-equipped seminar hall for academic presentations',
    isActive: true,
  },
];

// Function to normalize date to start of day in UTC
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Function to generate timeslots for a facility
const generateTimeslots = (facilityId, startDate, days = 90) => {
  const timeslots = [];
  
  // Generate hourly slots from 09:00 to 18:00
  const timeSlots = [];
  for (let hour = 9; hour < 18; hour++) {
    const start = `${hour.toString().padStart(2, '0')}:00`;
    const end = `${(hour + 1).toString().padStart(2, '0')}:00`;
    timeSlots.push({ start, end });
  }

  const normalizedStartDate = normalizeDate(startDate);

  for (let i = 0; i < days; i++) {
    const date = new Date(normalizedStartDate);
    date.setUTCDate(date.getUTCDate() + i);
    date.setUTCHours(0, 0, 0, 0);

    // Include all days (weekends included)
    // Note: Facilities can configure availability separately

    timeSlots.forEach((slot) => {
      timeslots.push({
        facilityId,
        date,
        startTime: slot.start,
        endTime: slot.end,
        isBooked: false,
        status: 'available',
      });
    });
  }

  return timeslots;
};

// Seed database
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Facility.deleteMany({});
    await Booking.deleteMany({});
    await Timeslot.deleteMany({});

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.create(users);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Assign admin to facilities
    const adminUser = createdUsers.find((u) => u.role === 'admin');

    // Create facilities
    console.log('🏢 Creating facilities...');
    const facilitiesWithAdmin = facilities.map((f) => ({
      ...f,
      adminId: adminUser._id,
    }));
    const createdFacilities = await Facility.create(facilitiesWithAdmin);
    console.log(`✅ Created ${createdFacilities.length} facilities`);

    // Update admin user with managed facilities
    adminUser.managedFacilities = createdFacilities.map((f) => f._id);
    await adminUser.save();

    // Generate timeslots for next 90 days
    console.log('⏰ Generating timeslots for next 90 days (including weekends)...');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let allTimeslots = [];
    createdFacilities.forEach((facility) => {
      const slots = generateTimeslots(facility._id, today, 90);
      allTimeslots = allTimeslots.concat(slots);
    });

    const createdTimeslots = await Timeslot.create(allTimeslots);
    console.log(`✅ Created ${createdTimeslots.length} timeslots`);

    // Create sample bookings
    console.log('📅 Creating sample bookings...');
    const requester = createdUsers.find((u) => u.role === 'requester');

    // find next day (within next 7 days) that has at least 2 timeslots for facility 0
    const facilityIdToUse = createdFacilities[0]._id;
    let selectedSlots = [];
    let selectedDate = null;

    for (let offset = 1; offset <= 7; offset++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + offset);
      d.setUTCHours(0, 0, 0, 0);

      // filter createdTimeslots for that facility + exact day
      const daySlots = createdTimeslots.filter((s) => {
        const slotDate = normalizeDate(s.date);
        return s.facilityId.equals(facilityIdToUse) && slotDate.getTime() === d.getTime();
      });

      if (daySlots.length >= 2) {
        selectedSlots = daySlots.slice(0, 2);
        selectedDate = d;
        break;
      }
    }

    if (selectedSlots.length >= 2 && requester) {
      const booking = await Booking.create({
        facilityId: facilityIdToUse,
        userId: requester._id,
        date: selectedDate,
        timeslots: selectedSlots.map((s) => s._id),
        purpose: 'Department Seminar on AI and Machine Learning',
        eventType: 'seminar',
        expectedAttendees: 80,
        equipmentRequired: ['Projector', 'Microphone'],
        status: 'pending',
      });

      // Update timeslots to reference booking
      await Timeslot.updateMany(
        { _id: { $in: selectedSlots.map((s) => s._id) } },
        { $set: { isBooked: true, bookingId: booking._id, status: 'pending' } }
      );

      console.log('✅ Created 1 sample booking');
    } else {
      console.log('⚠️  No suitable timeslots found in the next 7 days — skipping sample booking creation.');
    }

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📝 Login credentials:');
    console.log('   Admin:');
    console.log('   Email: admin@university.edu');
    console.log('   Password: admin123\n');
    console.log('   Requester:');
    console.log('   Email: john@university.edu');
    console.log('   Password: requester123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();
