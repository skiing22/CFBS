// Server-aligned types
export interface User {
  _id: string;
  id?: string; // For backward compatibility
  name: string;
  email: string;
  role: 'admin' | 'requester';
  department?: string;
  phone?: string;
  designation?: 'faculty' | 'staff' | 'student';
  managedFacilities?: string[] | Facility[]; // ObjectId references or populated
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Location {
  building: string;
  floor?: string;
  room?: string;
}

export interface Equipment {
  _id?: string;
  id?: string; // For backward compatibility
  name: string;
  quantity?: number;
  available: boolean;
}

export interface Facility {
  _id: string;
  id?: string; // For backward compatibility
  name: string;
  type: 'seminar_hall' | 'auditorium' | 'sports_ground' | 'guest_house' | 'conference_room' | 'laboratory' | 'other';
  capacity: number;
  location: Location | string; // Can be object or string (for backward compatibility)
  amenities: string[];
  equipment: Equipment[];
  adminId: string | User; // ObjectId reference or populated
  images?: string[];
  description?: string;
  isActive?: boolean;
  bookingRules?: {
    minBookingHours?: number;
    maxBookingHours?: number;
    advanceBookingDays?: number;
    requiresApproval?: boolean;
  };
  availability?: {
    [key: string]: { available: boolean; hours?: string };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Timeslot {
  _id: string;
  id?: string; // For backward compatibility
  facilityId: string | Facility;
  date: Date | string;
  startTime: string; // Format: "HH:MM" (e.g., "09:00")
  endTime: string;   // Format: "HH:MM" (e.g., "11:00")
  isBooked: boolean;
  bookingId?: string;
  status: 'available' | 'pending' | 'booked' | 'blocked';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Booking {
  _id: string;
  id?: string; // For backward compatibility
  facilityId: string | Facility;
  userId: string | User; // ObjectId reference or populated (was requesterId)
  date: Date | string;
  timeslots: string[] | Timeslot[]; // Array of ObjectId references or populated
  purpose: string; // Was title
  eventType: 'seminar' | 'workshop' | 'conference' | 'meeting' | 'sports' | 'cultural' | 'academic' | 'other';
  expectedAttendees?: number;
  equipmentRequired: string[]; // Was requiredEquipment
  specialRequests?: string; // Was additionalNotes
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejectionReason?: string;
  cancellationReason?: string;
  approvedBy?: string | User;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  // Legacy fields for backward compatibility
  title?: string;
  requesterId?: string;
  timeSlots?: TimeSlot[];
  additionalNotes?: string;
  adminId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Legacy TimeSlot interface for backward compatibility
export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface BookingRequest {
  facilityId: string;
  date: Date | string;
  timeslots: string[] | { startTime: string; endTime: string }[]; // ObjectIds or time objects
  purpose: string;
  eventType: 'seminar' | 'workshop' | 'conference' | 'meeting' | 'sports' | 'cultural' | 'academic' | 'other';
  expectedAttendees?: number;
  equipmentRequired: string[];
  specialRequests?: string;
}