/**
 * Sample Data for Campus Facility Booking System
 * 
 * This file contains sample data to populate the MongoDB collections
 * for development and testing purposes.
 */

const { ObjectId } = require('mongodb');

// Generate ObjectIds for consistent references
const userIds = {
  admin1: new ObjectId(),
  admin2: new ObjectId(),
  requester1: new ObjectId(),
  requester2: new ObjectId(),
  requester3: new ObjectId()
};

const facilityIds = {
  auditorium: new ObjectId(),
  seminarHall: new ObjectId(),
  sportsComplex: new ObjectId(),
  guestHouse: new ObjectId()
};

const bookingIds = {
  booking1: new ObjectId(),
  booking2: new ObjectId(),
  booking3: new ObjectId(),
  booking4: new ObjectId()
};

// =============================================================================
// SAMPLE USERS
// =============================================================================
const sampleUsers = [
  {
    _id: userIds.admin1,
    email: 'sarah.johnson@university.edu',
    name: 'Dr. Sarah Johnson',
    role: 'admin',
    department: 'Computer Science',
    phone: '+1-555-0101',
    facilityAccess: [facilityIds.auditorium, facilityIds.seminarHall],
    isActive: true,
    lastLogin: new Date('2024-12-01T09:00:00Z'),
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-12-01T09:00:00Z')
  },
  {
    _id: userIds.admin2,
    email: 'michael.brown@university.edu',
    name: 'Prof. Michael Brown',
    role: 'admin',
    department: 'Sports Department',
    phone: '+1-555-0102',
    facilityAccess: [facilityIds.sportsComplex, facilityIds.guestHouse],
    isActive: true,
    lastLogin: new Date('2024-11-30T16:30:00Z'),
    createdAt: new Date('2024-01-20T10:00:00Z'),
    updatedAt: new Date('2024-11-30T16:30:00Z')
  },
  {
    _id: userIds.requester1,
    email: 'emily.davis@university.edu',
    name: 'Dr. Emily Davis',
    role: 'requester',
    department: 'Mathematics',
    phone: '+1-555-0201',
    isActive: true,
    lastLogin: new Date('2024-12-01T14:15:00Z'),
    createdAt: new Date('2024-02-01T12:00:00Z'),
    updatedAt: new Date('2024-12-01T14:15:00Z')
  },
  {
    _id: userIds.requester2,
    email: 'john.smith@university.edu',
    name: 'John Smith',
    role: 'requester',
    department: 'Student Council',
    phone: '+1-555-0202',
    isActive: true,
    lastLogin: new Date('2024-11-29T11:45:00Z'),
    createdAt: new Date('2024-02-15T09:30:00Z'),
    updatedAt: new Date('2024-11-29T11:45:00Z')
  },
  {
    _id: userIds.requester3,
    email: 'lisa.wilson@university.edu',
    name: 'Lisa Wilson',
    role: 'requester',
    department: 'Physics',
    phone: '+1-555-0203',
    isActive: true,
    lastLogin: new Date('2024-11-28T13:20:00Z'),
    createdAt: new Date('2024-03-01T15:00:00Z'),
    updatedAt: new Date('2024-11-28T13:20:00Z')
  }
];

// =============================================================================
// SAMPLE FACILITIES
// =============================================================================
const sampleFacilities = [
  {
    _id: facilityIds.auditorium,
    name: 'Main Auditorium',
    type: 'auditorium',
    capacity: 500,
    location: 'Academic Block A, Ground Floor',
    adminId: userIds.admin1,
    amenities: ['Air Conditioning', 'Stage', 'Sound System', 'Lighting', 'Parking'],
    availableEquipment: [
      {
        id: 'eq_proj_001',
        name: 'High-Resolution Projector',
        available: true,
        description: '4K laser projector with wireless connectivity',
        maintenanceDate: new Date('2024-11-01T00:00:00Z')
      },
      {
        id: 'eq_mic_001',
        name: 'Wireless Microphone System',
        available: true,
        description: 'Professional wireless microphone system with 4 mics',
        maintenanceDate: new Date('2024-10-15T00:00:00Z')
      },
      {
        id: 'eq_sound_001',
        name: 'Professional Sound System',
        available: true,
        description: 'High-quality sound system with mixer',
        maintenanceDate: new Date('2024-11-10T00:00:00Z')
      },
      {
        id: 'eq_light_001',
        name: 'Stage Lighting',
        available: true,
        description: 'Professional stage lighting system',
        maintenanceDate: new Date('2024-09-20T00:00:00Z')
      }
    ],
    isActive: true,
    bookingRules: {
      maxAdvanceBookingDays: 180,
      minBookingHours: 2,
      maxBookingHours: 12,
      operatingHours: {
        start: '08:00',
        end: '22:00'
      },
      blackoutDates: [
        {
          startDate: new Date('2024-12-20T00:00:00Z'),
          endDate: new Date('2024-12-31T23:59:59Z'),
          reason: 'Year-end maintenance and cleaning'
        }
      ]
    },
    images: [
      'https://example.com/auditorium1.jpg',
      'https://example.com/auditorium2.jpg'
    ],
    createdAt: new Date('2024-01-10T08:00:00Z'),
    updatedAt: new Date('2024-11-15T10:30:00Z')
  },
  {
    _id: facilityIds.seminarHall,
    name: 'Seminar Hall 201',
    type: 'seminar_hall',
    capacity: 100,
    location: 'Academic Block B, 2nd Floor',
    adminId: userIds.admin1,
    amenities: ['Air Conditioning', 'Projector Screen', 'WiFi', 'Whiteboard'],
    availableEquipment: [
      {
        id: 'eq_proj_002',
        name: 'Standard Projector',
        available: true,
        description: '1080p projector with HDMI connectivity',
        maintenanceDate: new Date('2024-10-01T00:00:00Z')
      },
      {
        id: 'eq_wb_001',
        name: 'Interactive Whiteboard',
        available: true,
        description: 'Smart interactive whiteboard with touch capability',
        maintenanceDate: new Date('2024-09-15T00:00:00Z')
      },
      {
        id: 'eq_laptop_001',
        name: 'Presentation Laptop',
        available: true,
        description: 'Laptop with presentation software',
        maintenanceDate: new Date('2024-11-05T00:00:00Z')
      }
    ],
    isActive: true,
    bookingRules: {
      maxAdvanceBookingDays: 90,
      minBookingHours: 1,
      maxBookingHours: 8,
      operatingHours: {
        start: '07:00',
        end: '20:00'
      },
      blackoutDates: []
    },
    images: ['https://example.com/seminar1.jpg'],
    createdAt: new Date('2024-01-12T09:00:00Z'),
    updatedAt: new Date('2024-10-20T14:45:00Z')
  },
  {
    _id: facilityIds.sportsComplex,
    name: 'Sports Complex',
    type: 'sports_ground',
    capacity: 200,
    location: 'Sports Campus, Building C',
    adminId: userIds.admin2,
    amenities: ['Changing Rooms', 'Equipment Storage', 'Outdoor Lighting', 'Parking', 'First Aid Station'],
    availableEquipment: [
      {
        id: 'eq_scoreboard_001',
        name: 'Electronic Scoreboard',
        available: true,
        description: 'Digital scoreboard for various sports',
        maintenanceDate: new Date('2024-08-30T00:00:00Z')
      },
      {
        id: 'eq_timer_001',
        name: 'Sport Timer System',
        available: true,
        description: 'Professional sport timing system',
        maintenanceDate: new Date('2024-09-10T00:00:00Z')
      }
    ],
    isActive: true,
    bookingRules: {
      maxAdvanceBookingDays: 60,
      minBookingHours: 2,
      maxBookingHours: 10,
      operatingHours: {
        start: '06:00',
        end: '21:00'
      },
      blackoutDates: [
        {
          startDate: new Date('2024-12-15T00:00:00Z'),
          endDate: new Date('2024-12-17T23:59:59Z'),
          reason: 'Annual sports tournament'
        }
      ]
    },
    images: ['https://example.com/sports1.jpg', 'https://example.com/sports2.jpg'],
    createdAt: new Date('2024-01-18T11:00:00Z'),
    updatedAt: new Date('2024-11-01T16:20:00Z')
  },
  {
    _id: facilityIds.guestHouse,
    name: 'Guest House - Conference Room',
    type: 'guest_house',
    capacity: 30,
    location: 'Guest House Building, 1st Floor',
    adminId: userIds.admin2,
    amenities: ['Air Conditioning', 'Tea/Coffee Setup', 'WiFi', 'Conference Table'],
    availableEquipment: [
      {
        id: 'eq_proj_003',
        name: 'Portable Projector',
        available: true,
        description: 'Compact projector for small meetings',
        maintenanceDate: new Date('2024-10-25T00:00:00Z')
      },
      {
        id: 'eq_conf_001',
        name: 'Conference Phone',
        available: true,
        description: 'HD conference phone system',
        maintenanceDate: new Date('2024-09-05T00:00:00Z')
      }
    ],
    isActive: true,
    bookingRules: {
      maxAdvanceBookingDays: 45,
      minBookingHours: 1,
      maxBookingHours: 6,
      operatingHours: {
        start: '08:00',
        end: '18:00'
      },
      blackoutDates: []
    },
    images: ['https://example.com/guesthouse1.jpg'],
    createdAt: new Date('2024-01-25T13:30:00Z'),
    updatedAt: new Date('2024-10-30T09:15:00Z')
  }
];

// =============================================================================
// SAMPLE BOOKINGS
// =============================================================================
const sampleBookings = [
  {
    _id: bookingIds.booking1,
    facilityId: facilityIds.auditorium,
    requesterId: userIds.requester1,
    adminId: userIds.admin1,
    title: 'Mathematics Department Annual Conference',
    purpose: 'Academic Conference',
    startDate: new Date('2024-12-15T09:00:00Z'),
    endDate: new Date('2024-12-15T17:00:00Z'),
    status: 'approved',
    requiredEquipment: ['eq_proj_001', 'eq_mic_001', 'eq_sound_001'],
    additionalNotes: 'Need setup by 8:30 AM. Expecting 450 attendees.',
    approvalNotes: 'Approved. Setup team will be available at 8:00 AM.',
    attendeeCount: 450,
    contactPerson: {
      name: 'Dr. Emily Davis',
      phone: '+1-555-0201',
      email: 'emily.davis@university.edu'
    },
    setupRequirements: 'Stage setup for 5 speakers, podium with laptop connection',
    isRecurring: false,
    statusHistory: [
      {
        status: 'pending',
        changedBy: userIds.requester1,
        changedAt: new Date('2024-11-20T10:00:00Z'),
        notes: 'Initial booking request'
      },
      {
        status: 'approved',
        changedBy: userIds.admin1,
        changedAt: new Date('2024-11-22T14:30:00Z'),
        notes: 'Approved after reviewing requirements'
      }
    ],
    createdAt: new Date('2024-11-20T10:00:00Z'),
    updatedAt: new Date('2024-11-22T14:30:00Z'),
    approvedAt: new Date('2024-11-22T14:30:00Z')
  },
  {
    _id: bookingIds.booking2,
    facilityId: facilityIds.seminarHall,
    requesterId: userIds.requester2,
    adminId: userIds.admin1,
    title: 'Student Council Weekly Meeting',
    purpose: 'Administrative Meeting',
    startDate: new Date('2024-12-10T14:00:00Z'),
    endDate: new Date('2024-12-10T16:00:00Z'),
    status: 'pending',
    requiredEquipment: ['eq_proj_002'],
    additionalNotes: 'Regular weekly meeting, discussing semester events.',
    attendeeCount: 25,
    contactPerson: {
      name: 'John Smith',
      phone: '+1-555-0202',
      email: 'john.smith@university.edu'
    },
    setupRequirements: 'Standard classroom setup',
    isRecurring: true,
    recurringPattern: {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [2], // Tuesday
      endDate: new Date('2025-05-30T00:00:00Z')
    },
    statusHistory: [
      {
        status: 'pending',
        changedBy: userIds.requester2,
        changedAt: new Date('2024-11-25T09:00:00Z'),
        notes: 'Weekly recurring meeting request'
      }
    ],
    createdAt: new Date('2024-11-25T09:00:00Z'),
    updatedAt: new Date('2024-11-25T09:00:00Z')
  },
  {
    _id: bookingIds.booking3,
    facilityId: facilityIds.sportsComplex,
    requesterId: userIds.requester3,
    adminId: userIds.admin2,
    title: 'Physics Department Sports Day',
    purpose: 'Recreational Event',
    startDate: new Date('2024-12-20T08:00:00Z'),
    endDate: new Date('2024-12-20T18:00:00Z'),
    status: 'rejected',
    requiredEquipment: ['eq_scoreboard_001', 'eq_timer_001'],
    additionalNotes: 'Annual department sports day with various competitions.',
    rejectionReason: 'Facility already booked for annual sports tournament during this period.',
    attendeeCount: 150,
    contactPerson: {
      name: 'Lisa Wilson',
      phone: '+1-555-0203',
      email: 'lisa.wilson@university.edu'
    },
    setupRequirements: 'Multiple sport areas setup, scoring systems',
    isRecurring: false,
    statusHistory: [
      {
        status: 'pending',
        changedBy: userIds.requester3,
        changedAt: new Date('2024-11-18T11:00:00Z'),
        notes: 'Sports day booking request'
      },
      {
        status: 'rejected',
        changedBy: userIds.admin2,
        changedAt: new Date('2024-11-20T16:45:00Z'),
        notes: 'Conflicts with annual tournament'
      }
    ],
    createdAt: new Date('2024-11-18T11:00:00Z'),
    updatedAt: new Date('2024-11-20T16:45:00Z'),
    rejectedAt: new Date('2024-11-20T16:45:00Z')
  },
  {
    _id: bookingIds.booking4,
    facilityId: facilityIds.guestHouse,
    requesterId: userIds.requester1,
    adminId: userIds.admin2,
    title: 'Research Committee Meeting',
    purpose: 'Administrative Meeting',
    startDate: new Date('2024-12-05T10:00:00Z'),
    endDate: new Date('2024-12-05T12:00:00Z'),
    status: 'approved',
    requiredEquipment: ['eq_proj_003', 'eq_conf_001'],
    additionalNotes: 'Monthly research committee meeting with external participants.',
    approvalNotes: 'Approved. Tea/coffee service will be arranged.',
    attendeeCount: 12,
    contactPerson: {
      name: 'Dr. Emily Davis',
      phone: '+1-555-0201',
      email: 'emily.davis@university.edu'
    },
    setupRequirements: 'Conference table setup for 12 people, video conferencing capability',
    isRecurring: true,
    recurringPattern: {
      frequency: 'monthly',
      interval: 1,
      endDate: new Date('2025-12-31T00:00:00Z')
    },
    statusHistory: [
      {
        status: 'pending',
        changedBy: userIds.requester1,
        changedAt: new Date('2024-11-15T13:20:00Z'),
        notes: 'Monthly meeting booking'
      },
      {
        status: 'approved',
        changedBy: userIds.admin2,
        changedAt: new Date('2024-11-16T09:15:00Z'),
        notes: 'Approved with catering arrangement'
      }
    ],
    createdAt: new Date('2024-11-15T13:20:00Z'),
    updatedAt: new Date('2024-11-16T09:15:00Z'),
    approvedAt: new Date('2024-11-16T09:15:00Z')
  }
];

// =============================================================================
// SAMPLE NOTIFICATIONS
// =============================================================================
const sampleNotifications = [
  {
    _id: new ObjectId(),
    userId: userIds.requester1,
    type: 'booking_approved',
    title: 'Booking Approved: Mathematics Department Annual Conference',
    message: 'Your booking for Main Auditorium on December 15, 2024 has been approved.',
    relatedBookingId: bookingIds.booking1,
    relatedFacilityId: facilityIds.auditorium,
    isRead: true,
    isEmailSent: true,
    emailSentAt: new Date('2024-11-22T14:35:00Z'),
    readAt: new Date('2024-11-22T15:10:00Z'),
    createdAt: new Date('2024-11-22T14:35:00Z'),
    expiresAt: new Date('2025-01-22T14:35:00Z')
  },
  {
    _id: new ObjectId(),
    userId: userIds.requester3,
    type: 'booking_rejected',
    title: 'Booking Rejected: Physics Department Sports Day',
    message: 'Your booking for Sports Complex on December 20, 2024 has been rejected. Reason: Facility already booked for annual sports tournament during this period.',
    relatedBookingId: bookingIds.booking3,
    relatedFacilityId: facilityIds.sportsComplex,
    isRead: false,
    isEmailSent: true,
    emailSentAt: new Date('2024-11-20T16:50:00Z'),
    createdAt: new Date('2024-11-20T16:50:00Z'),
    expiresAt: new Date('2025-01-20T16:50:00Z')
  },
  {
    _id: new ObjectId(),
    userId: userIds.admin1,
    type: 'booking_pending',
    title: 'New Booking Request: Student Council Weekly Meeting',
    message: 'A new booking request has been submitted for Seminar Hall 201 requiring your approval.',
    relatedBookingId: bookingIds.booking2,
    relatedFacilityId: facilityIds.seminarHall,
    isRead: false,
    isEmailSent: true,
    emailSentAt: new Date('2024-11-25T09:05:00Z'),
    createdAt: new Date('2024-11-25T09:05:00Z'),
    expiresAt: new Date('2025-01-25T09:05:00Z')
  }
];

// =============================================================================
// SAMPLE AUDIT LOGS
// =============================================================================
const sampleAuditLogs = [
  {
    _id: new ObjectId(),
    userId: userIds.requester1,
    action: 'create',
    resourceType: 'booking',
    resourceId: bookingIds.booking1,
    details: {
      facilityName: 'Main Auditorium',
      eventTitle: 'Mathematics Department Annual Conference'
    },
    newValues: {
      title: 'Mathematics Department Annual Conference',
      status: 'pending'
    },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date('2024-11-20T10:00:00Z')
  },
  {
    _id: new ObjectId(),
    userId: userIds.admin1,
    action: 'approve',
    resourceType: 'booking',
    resourceId: bookingIds.booking1,
    details: {
      facilityName: 'Main Auditorium',
      eventTitle: 'Mathematics Department Annual Conference'
    },
    oldValues: {
      status: 'pending'
    },
    newValues: {
      status: 'approved',
      approvalNotes: 'Approved. Setup team will be available at 8:00 AM.'
    },
    ipAddress: '192.168.1.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: new Date('2024-11-22T14:30:00Z')
  },
  {
    _id: new ObjectId(),
    userId: userIds.admin2,
    action: 'reject',
    resourceType: 'booking',
    resourceId: bookingIds.booking3,
    details: {
      facilityName: 'Sports Complex',
      eventTitle: 'Physics Department Sports Day'
    },
    oldValues: {
      status: 'pending'
    },
    newValues: {
      status: 'rejected',
      rejectionReason: 'Facility already booked for annual sports tournament during this period.'
    },
    ipAddress: '192.168.1.75',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date('2024-11-20T16:45:00Z')
  }
];

// =============================================================================
// SAMPLE SYSTEM SETTINGS (Additional to defaults)
// =============================================================================
const additionalSystemSettings = [
  {
    _id: new ObjectId(),
    key: 'university_name',
    value: 'Sample University',
    description: 'Name of the university',
    category: 'general',
    isPublic: true,
    updatedBy: userIds.admin1,
    updatedAt: new Date('2024-01-10T08:00:00Z')
  },
  {
    _id: new ObjectId(),
    key: 'admin_email',
    value: 'admin@university.edu',
    description: 'Primary admin email for system notifications',
    category: 'system',
    isPublic: false,
    updatedBy: userIds.admin1,
    updatedAt: new Date('2024-01-10T08:00:00Z')
  },
  {
    _id: new ObjectId(),
    key: 'booking_approval_reminder_hours',
    value: 24,
    description: 'Hours before sending reminder for pending approvals',
    category: 'notifications',
    isPublic: false,
    updatedBy: userIds.admin1,
    updatedAt: new Date('2024-03-15T10:00:00Z')
  }
];

// =============================================================================
// INSERTION FUNCTION
// =============================================================================
export const insertSampleData = async (db) => {
  try {
    console.log('Inserting sample data...');

    // Insert users
    await db.collection('users').insertMany(sampleUsers);
    console.log(`Inserted ${sampleUsers.length} sample users`);

    // Insert facilities
    await db.collection('facilities').insertMany(sampleFacilities);
    console.log(`Inserted ${sampleFacilities.length} sample facilities`);

    // Insert bookings
    await db.collection('bookings').insertMany(sampleBookings);
    console.log(`Inserted ${sampleBookings.length} sample bookings`);

    // Insert notifications
    await db.collection('notifications').insertMany(sampleNotifications);
    console.log(`Inserted ${sampleNotifications.length} sample notifications`);

    // Insert audit logs
    await db.collection('audit_logs').insertMany(sampleAuditLogs);
    console.log(`Inserted ${sampleAuditLogs.length} sample audit logs`);

    // Insert additional system settings
    await db.collection('system_settings').insertMany(additionalSystemSettings);
    console.log(`Inserted ${additionalSystemSettings.length} additional system settings`);

    console.log('Sample data insertion completed successfully!');

  } catch (error) {
    console.error('Sample data insertion failed:', error);
    throw error;
  }
};

// =============================================================================
// EXPORT
// =============================================================================
module.exports = {
  sampleUsers,
  sampleFacilities,
  sampleBookings,
  sampleNotifications,
  sampleAuditLogs,
  additionalSystemSettings,
  insertSampleData,
  userIds,
  facilityIds,
  bookingIds
};

// Example usage:
/*
const { MongoClient } = require('mongodb');
const { insertSampleData } = require('./sample-data');

async function setupSampleData() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('campus_facility_booking');
  
  await insertSampleData(db);
  
  await client.close();
}
*/