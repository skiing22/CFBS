/**
 * MongoDB Collections Schema for Campus Facility Booking System
 * 
 * This file defines the structure and validation rules for all MongoDB collections
 * used in the Campus Facility Booking System.
 */

// =============================================================================
// USERS COLLECTION
// =============================================================================
const usersCollection = {
  name: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "role", "createdAt"],
      properties: {
        _id: {
          bsonType: "objectId"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Valid email address"
        },
        name: {
          bsonType: "string",
          minLength: 2,
          maxLength: 100,
          description: "User's full name"
        },
        role: {
          enum: ["admin", "requester"],
          description: "User role - admin or requester"
        },
        department: {
          bsonType: "string",
          maxLength: 100,
          description: "User's department (optional)"
        },
        facilityAccess: {
          bsonType: "array",
          items: {
            bsonType: "objectId"
          },
          description: "Array of facility IDs that admin users can manage"
        },
        phone: {
          bsonType: "string",
          description: "User's phone number (optional)"
        },
        isActive: {
          bsonType: "bool",
          description: "Whether the user account is active"
        },
        lastLogin: {
          bsonType: "date",
          description: "Last login timestamp"
        },
        createdAt: {
          bsonType: "date",
          description: "Account creation timestamp"
        },
        updatedAt: {
          bsonType: "date",
          description: "Last update timestamp"
        }
      }
    }
  },
  indexes: [
    { email: 1 }, // Unique index for email
    { role: 1 },
    { department: 1 },
    { isActive: 1 }
  ]
};

// =============================================================================
// FACILITIES COLLECTION
// =============================================================================
const facilitiesCollection = {
  name: "facilities",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "type", "capacity", "location", "adminId", "createdAt"],
      properties: {
        _id: {
          bsonType: "objectId"
        },
        name: {
          bsonType: "string",
          minLength: 2,
          maxLength: 200,
          description: "Facility name"
        },
        type: {
          enum: ["seminar_hall", "auditorium", "sports_ground", "guest_house"],
          description: "Type of facility"
        },
        capacity: {
          bsonType: "int",
          minimum: 1,
          maximum: 10000,
          description: "Maximum capacity of the facility"
        },
        location: {
          bsonType: "string",
          minLength: 2,
          maxLength: 300,
          description: "Physical location of the facility"
        },
        adminId: {
          bsonType: "objectId",
          description: "Reference to the admin user who manages this facility"
        },
        amenities: {
          bsonType: "array",
          items: {
            bsonType: "string",
            maxLength: 100
          },
          description: "List of amenities available in the facility"
        },
        availableEquipment: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["id", "name", "available"],
            properties: {
              id: {
                bsonType: "string",
                description: "Equipment identifier"
              },
              name: {
                bsonType: "string",
                minLength: 1,
                maxLength: 100,
                description: "Equipment name"
              },
              available: {
                bsonType: "bool",
                description: "Whether equipment is currently available"
              },
              description: {
                bsonType: "string",
                maxLength: 500,
                description: "Equipment description (optional)"
              },
              maintenanceDate: {
                bsonType: "date",
                description: "Last maintenance date (optional)"
              }
            }
          },
          description: "Equipment available in this facility"
        },
        isActive: {
          bsonType: "bool",
          description: "Whether the facility is active and bookable"
        },
        bookingRules: {
          bsonType: "object",
          properties: {
            maxAdvanceBookingDays: {
              bsonType: "int",
              minimum: 1,
              maximum: 365,
              description: "Maximum days in advance booking is allowed"
            },
            minBookingHours: {
              bsonType: "int",
              minimum: 1,
              maximum: 24,
              description: "Minimum booking duration in hours"
            },
            maxBookingHours: {
              bsonType: "int",
              minimum: 1,
              maximum: 168,
              description: "Maximum booking duration in hours"
            },
            operatingHours: {
              bsonType: "object",
              properties: {
                start: {
                  bsonType: "string",
                  pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
                  description: "Operating start time (HH:MM format)"
                },
                end: {
                  bsonType: "string",
                  pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
                  description: "Operating end time (HH:MM format)"
                }
              }
            },
            blackoutDates: {
              bsonType: "array",
              items: {
                bsonType: "object",
                properties: {
                  startDate: { bsonType: "date" },
                  endDate: { bsonType: "date" },
                  reason: { bsonType: "string" }
                }
              },
              description: "Dates when facility is not available"
            }
          }
        },
        images: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          description: "Array of image URLs for the facility"
        },
        createdAt: {
          bsonType: "date",
          description: "Facility creation timestamp"
        },
        updatedAt: {
          bsonType: "date",
          description: "Last update timestamp"
        }
      }
    }
  },
  indexes: [
    { adminId: 1 },
    { type: 1 },
    { location: 1 },
    { isActive: 1 },
    { name: "text", location: "text" } // Text search index
  ]
};

// =============================================================================
// BOOKINGS COLLECTION
// =============================================================================
const bookingsCollection = {
  name: "bookings",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["facilityId", "requesterId", "title", "purpose", "startDate", "endDate", "status", "createdAt"],
      properties: {
        _id: {
          bsonType: "objectId"
        },
        facilityId: {
          bsonType: "objectId",
          description: "Reference to the facility being booked"
        },
        requesterId: {
          bsonType: "objectId",
          description: "Reference to the user making the booking request"
        },
        adminId: {
          bsonType: "objectId",
          description: "Reference to the admin who will handle this booking"
        },
        title: {
          bsonType: "string",
          minLength: 2,
          maxLength: 200,
          description: "Title of the event/booking"
        },
        purpose: {
          bsonType: "string",
          minLength: 2,
          maxLength: 500,
          description: "Purpose of the booking"
        },
        startDate: {
          bsonType: "date",
          description: "Booking start date and time"
        },
        endDate: {
          bsonType: "date",
          description: "Booking end date and time"
        },
        status: {
          enum: ["pending", "approved", "rejected", "cancelled"],
          description: "Current status of the booking"
        },
        requiredEquipment: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          description: "Array of equipment IDs requested for this booking"
        },
        additionalNotes: {
          bsonType: "string",
          maxLength: 1000,
          description: "Additional notes from the requester"
        },
        rejectionReason: {
          bsonType: "string",
          maxLength: 1000,
          description: "Reason for rejection (if status is rejected)"
        },
        approvalNotes: {
          bsonType: "string",
          maxLength: 1000,
          description: "Notes from admin when approving"
        },
        attendeeCount: {
          bsonType: "int",
          minimum: 1,
          description: "Expected number of attendees"
        },
        contactPerson: {
          bsonType: "object",
          properties: {
            name: {
              bsonType: "string",
              maxLength: 100
            },
            phone: {
              bsonType: "string",
              maxLength: 20
            },
            email: {
              bsonType: "string"
            }
          },
          description: "Contact person for the event"
        },
        setupRequirements: {
          bsonType: "string",
          maxLength: 1000,
          description: "Special setup requirements"
        },
        isRecurring: {
          bsonType: "bool",
          description: "Whether this is a recurring booking"
        },
        recurringPattern: {
          bsonType: "object",
          properties: {
            frequency: {
              enum: ["daily", "weekly", "monthly"],
              description: "Recurrence frequency"
            },
            interval: {
              bsonType: "int",
              minimum: 1,
              description: "Interval between recurrences"
            },
            daysOfWeek: {
              bsonType: "array",
              items: {
                bsonType: "int",
                minimum: 0,
                maximum: 6
              },
              description: "Days of week for weekly recurrence (0=Sunday)"
            },
            endDate: {
              bsonType: "date",
              description: "End date for recurrence"
            }
          }
        },
        statusHistory: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              status: {
                enum: ["pending", "approved", "rejected", "cancelled"]
              },
              changedBy: {
                bsonType: "objectId"
              },
              changedAt: {
                bsonType: "date"
              },
              notes: {
                bsonType: "string"
              }
            }
          },
          description: "History of status changes"
        },
        createdAt: {
          bsonType: "date",
          description: "Booking request creation timestamp"
        },
        updatedAt: {
          bsonType: "date",
          description: "Last update timestamp"
        },
        approvedAt: {
          bsonType: "date",
          description: "Approval timestamp"
        },
        rejectedAt: {
          bsonType: "date",
          description: "Rejection timestamp"
        }
      }
    }
  },
  indexes: [
    { facilityId: 1, startDate: 1, endDate: 1 }, // Compound index for availability checks
    { requesterId: 1 },
    { adminId: 1 },
    { status: 1 },
    { createdAt: -1 },
    { startDate: 1 },
    { endDate: 1 }
  ]
};

// =============================================================================
// NOTIFICATIONS COLLECTION
// =============================================================================
const notificationsCollection = {
  name: "notifications",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "type", "title", "message", "createdAt"],
      properties: {
        _id: {
          bsonType: "objectId"
        },
        userId: {
          bsonType: "objectId",
          description: "Reference to the user who should receive this notification"
        },
        type: {
          enum: ["booking_approved", "booking_rejected", "booking_pending", "booking_cancelled", "facility_update", "system_message"],
          description: "Type of notification"
        },
        title: {
          bsonType: "string",
          minLength: 1,
          maxLength: 200,
          description: "Notification title"
        },
        message: {
          bsonType: "string",
          minLength: 1,
          maxLength: 1000,
          description: "Notification message"
        },
        relatedBookingId: {
          bsonType: "objectId",
          description: "Reference to related booking (optional)"
        },
        relatedFacilityId: {
          bsonType: "objectId",
          description: "Reference to related facility (optional)"
        },
        isRead: {
          bsonType: "bool",
          description: "Whether the notification has been read"
        },
        isEmailSent: {
          bsonType: "bool",
          description: "Whether email notification was sent"
        },
        emailSentAt: {
          bsonType: "date",
          description: "When email was sent"
        },
        readAt: {
          bsonType: "date",
          description: "When notification was read"
        },
        createdAt: {
          bsonType: "date",
          description: "Notification creation timestamp"
        },
        expiresAt: {
          bsonType: "date",
          description: "When notification expires (for cleanup)"
        }
      }
    }
  },
  indexes: [
    { userId: 1, createdAt: -1 },
    { isRead: 1 },
    { type: 1 },
    { expiresAt: 1 }, // TTL index for automatic cleanup
    { relatedBookingId: 1 },
    { relatedFacilityId: 1 }
  ]
};

// =============================================================================
// AUDIT_LOGS COLLECTION
// =============================================================================
const auditLogsCollection = {
  name: "audit_logs",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "action", "resourceType", "timestamp"],
      properties: {
        _id: {
          bsonType: "objectId"
        },
        userId: {
          bsonType: "objectId",
          description: "Reference to the user who performed the action"
        },
        action: {
          enum: ["create", "update", "delete", "approve", "reject", "cancel", "login", "logout"],
          description: "Type of action performed"
        },
        resourceType: {
          enum: ["user", "facility", "booking", "notification"],
          description: "Type of resource affected"
        },
        resourceId: {
          bsonType: "objectId",
          description: "ID of the affected resource"
        },
        details: {
          bsonType: "object",
          description: "Additional details about the action"
        },
        oldValues: {
          bsonType: "object",
          description: "Previous values (for update operations)"
        },
        newValues: {
          bsonType: "object",
          description: "New values (for update operations)"
        },
        ipAddress: {
          bsonType: "string",
          description: "IP address of the user"
        },
        userAgent: {
          bsonType: "string",
          description: "User agent string"
        },
        timestamp: {
          bsonType: "date",
          description: "When the action occurred"
        }
      }
    }
  },
  indexes: [
    { userId: 1, timestamp: -1 },
    { resourceType: 1, resourceId: 1 },
    { action: 1 },
    { timestamp: -1 },
    { timestamp: 1 } // TTL index for log retention policy
  ]
};

// =============================================================================
// SYSTEM_SETTINGS COLLECTION
// =============================================================================
const systemSettingsCollection = {
  name: "system_settings",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["key", "value", "updatedAt"],
      properties: {
        _id: {
          bsonType: "objectId"
        },
        key: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100,
          description: "Setting key identifier"
        },
        value: {
          description: "Setting value (can be any type)"
        },
        description: {
          bsonType: "string",
          maxLength: 500,
          description: "Description of the setting"
        },
        category: {
          bsonType: "string",
          maxLength: 100,
          description: "Setting category"
        },
        isPublic: {
          bsonType: "bool",
          description: "Whether this setting can be read by non-admin users"
        },
        updatedBy: {
          bsonType: "objectId",
          description: "User who last updated this setting"
        },
        updatedAt: {
          bsonType: "date",
          description: "When setting was last updated"
        }
      }
    }
  },
  indexes: [
    { key: 1 }, // Unique index
    { category: 1 },
    { isPublic: 1 }
  ]
};

// =============================================================================
// DATABASE INITIALIZATION SCRIPT
// =============================================================================
export const initializeDatabase = async (db) => {
  try {
    // Create collections with validation
    const collections = [
      usersCollection,
      facilitiesCollection,
      bookingsCollection,
      notificationsCollection,
      auditLogsCollection,
      systemSettingsCollection
    ];

    for (const collection of collections) {
      console.log(`Creating collection: ${collection.name}`);
      
      // Create collection with validation
      await db.createCollection(collection.name, {
        validator: collection.validator
      });

      // Create indexes
      if (collection.indexes && collection.indexes.length > 0) {
        console.log(`Creating indexes for: ${collection.name}`);
        for (const index of collection.indexes) {
          await db.collection(collection.name).createIndex(index);
        }
      }
    }

    // Create unique indexes that need special handling
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('system_settings').createIndex({ key: 1 }, { unique: true });

    // Create TTL indexes for automatic cleanup
    await db.collection('notifications').createIndex(
      { expiresAt: 1 }, 
      { expireAfterSeconds: 0 }
    );
    
    // Set up audit log retention (e.g., keep logs for 1 year)
    await db.collection('audit_logs').createIndex(
      { timestamp: 1 }, 
      { expireAfterSeconds: 31536000 } // 365 days
    );

    console.log('Database initialization completed successfully!');
    
    // Insert default system settings
    await insertDefaultSettings(db);
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================
const insertDefaultSettings = async (db) => {
  const defaultSettings = [
    {
      key: 'max_advance_booking_days',
      value: 90,
      description: 'Maximum days in advance a facility can be booked',
      category: 'booking_rules',
      isPublic: true,
      updatedAt: new Date()
    },
    {
      key: 'min_booking_duration_hours',
      value: 1,
      description: 'Minimum booking duration in hours',
      category: 'booking_rules',
      isPublic: true,
      updatedAt: new Date()
    },
    {
      key: 'max_booking_duration_hours',
      value: 24,
      description: 'Maximum booking duration in hours',
      category: 'booking_rules',
      isPublic: true,
      updatedAt: new Date()
    },
    {
      key: 'auto_approve_recurring_bookings',
      value: false,
      description: 'Whether to automatically approve recurring bookings',
      category: 'booking_rules',
      isPublic: false,
      updatedAt: new Date()
    },
    {
      key: 'email_notifications_enabled',
      value: true,
      description: 'Whether to send email notifications',
      category: 'notifications',
      isPublic: false,
      updatedAt: new Date()
    },
    {
      key: 'notification_retention_days',
      value: 30,
      description: 'How long to keep notifications before deletion',
      category: 'system',
      isPublic: false,
      updatedAt: new Date()
    }
  ];

  await db.collection('system_settings').insertMany(defaultSettings);
  console.log('Default settings inserted successfully!');
};

// =============================================================================
// EXPORT
// =============================================================================
export default {
  usersCollection,
  facilitiesCollection,
  bookingsCollection,
  notificationsCollection,
  auditLogsCollection,
  systemSettingsCollection,
  initializeDatabase
};

// Example usage:
/*
const { MongoClient } = require('mongodb');

async function setupDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('campus_facility_booking');
  
  await initializeDatabase(db);
  
  await client.close();
}
*/