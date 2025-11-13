// Data transformers between client and server formats
import { User, Facility, Booking, Timeslot, BookingRequest, Location } from '../types';

/**
 * Transform server facility to client format
 */
export function transformFacilityToClient(serverFacility: any): Facility {
  return {
    _id: serverFacility._id || serverFacility.id,
    id: serverFacility._id || serverFacility.id, // For backward compatibility
    name: serverFacility.name,
    type: serverFacility.type,
    capacity: serverFacility.capacity,
    location: typeof serverFacility.location === 'string' 
      ? serverFacility.location 
      : serverFacility.location,
    amenities: serverFacility.amenities || [],
    equipment: (serverFacility.equipment || []).map((eq: any) => ({
      _id: eq._id || eq.id,
      id: eq._id || eq.id,
      name: eq.name,
      quantity: eq.quantity || 1,
      available: eq.available !== undefined ? eq.available : true,
    })),
    adminId: serverFacility.adminId?._id || serverFacility.adminId || '',
    images: serverFacility.images || [],
    description: serverFacility.description,
    isActive: serverFacility.isActive !== undefined ? serverFacility.isActive : true,
    bookingRules: serverFacility.bookingRules,
    availability: serverFacility.availability,
    createdAt: serverFacility.createdAt ? new Date(serverFacility.createdAt) : undefined,
    updatedAt: serverFacility.updatedAt ? new Date(serverFacility.updatedAt) : undefined,
  };
}

/**
 * Transform server user to client format
 */
export function transformUserToClient(serverUser: any): User {
  return {
    _id: serverUser._id || serverUser.id,
    id: serverUser._id || serverUser.id, // For backward compatibility
    name: serverUser.name,
    email: serverUser.email,
    role: serverUser.role,
    department: serverUser.department,
    phone: serverUser.phone,
    designation: serverUser.designation,
    managedFacilities: serverUser.managedFacilities || [],
    isActive: serverUser.isActive !== undefined ? serverUser.isActive : true,
    createdAt: serverUser.createdAt ? new Date(serverUser.createdAt) : undefined,
    updatedAt: serverUser.updatedAt ? new Date(serverUser.updatedAt) : undefined,
  };
}

/**
 * Transform server booking to client format
 */
export function transformBookingToClient(serverBooking: any): Booking {
  const facility = serverBooking.facilityId;
  const user = serverBooking.userId;
  const timeslots = serverBooking.timeslots || [];

  return {
    _id: serverBooking._id || serverBooking.id,
    id: serverBooking._id || serverBooking.id, // For backward compatibility
    facilityId: facility,
    userId: user,
    date: serverBooking.date ? new Date(serverBooking.date) : new Date(),
    timeslots: timeslots,
    purpose: serverBooking.purpose || serverBooking.title || '',
    eventType: serverBooking.eventType || 'other',
    expectedAttendees: serverBooking.expectedAttendees,
    equipmentRequired: serverBooking.equipmentRequired || [],
    specialRequests: serverBooking.specialRequests || serverBooking.additionalNotes,
    status: serverBooking.status,
    rejectionReason: serverBooking.rejectionReason,
    cancellationReason: serverBooking.cancellationReason,
    approvedBy: serverBooking.approvedBy?._id || serverBooking.approvedBy,
    approvedAt: serverBooking.approvedAt ? new Date(serverBooking.approvedAt) : undefined,
    notes: serverBooking.notes,
    createdAt: serverBooking.createdAt ? new Date(serverBooking.createdAt) : new Date(),
    updatedAt: serverBooking.updatedAt ? new Date(serverBooking.updatedAt) : undefined,
    // Legacy fields
    title: serverBooking.purpose || serverBooking.title,
    requesterId: user?._id || user || serverBooking.userId,
    timeSlots: Array.isArray(timeslots) && timeslots.length > 0 && typeof timeslots[0] !== 'string'
      ? timeslots.map((ts: any) => ({
          id: ts._id || ts.id || '',
          startTime: ts.startTime,
          endTime: ts.endTime,
        }))
      : [],
    additionalNotes: serverBooking.specialRequests || serverBooking.additionalNotes,
    adminId: facility?.adminId || (typeof facility === 'object' ? facility.adminId : undefined),
  };
}

/**
 * Transform server timeslot to client format
 */
export function transformTimeslotToClient(serverTimeslot: any): Timeslot {
  return {
    _id: serverTimeslot._id || serverTimeslot.id,
    id: serverTimeslot._id || serverTimeslot.id,
    facilityId: serverTimeslot.facilityId?._id || serverTimeslot.facilityId,
    date: serverTimeslot.date ? new Date(serverTimeslot.date) : new Date(),
    startTime: serverTimeslot.startTime,
    endTime: serverTimeslot.endTime,
    isBooked: serverTimeslot.isBooked || false,
    bookingId: serverTimeslot.bookingId,
    status: serverTimeslot.status || 'available',
    createdAt: serverTimeslot.createdAt ? new Date(serverTimeslot.createdAt) : undefined,
    updatedAt: serverTimeslot.updatedAt ? new Date(serverTimeslot.updatedAt) : undefined,
  };
}

/**
 * Transform client booking request to server format
 */
export function transformBookingRequestToServer(request: BookingRequest): any {
  return {
    facilityId: request.facilityId,
    date: typeof request.date === 'string' ? request.date : request.date.toISOString(),
    timeslots: request.timeslots, // Server expects ObjectIds or will create timeslots
    purpose: request.purpose,
    eventType: request.eventType,
    expectedAttendees: request.expectedAttendees,
    equipmentRequired: request.equipmentRequired || [],
    specialRequests: request.specialRequests,
  };
}

/**
 * Transform facility form data to server format
 */
export function transformFacilityToServer(facility: {
  name: string;
  type: string;
  capacity: number | string;
  location: string | Location;
  amenities: string | string[];
  equipment?: Array<{ name: string; quantity?: number }>;
}): any {
  const locationObj = typeof facility.location === 'string' 
    ? { building: facility.location }
    : facility.location;

  return {
    name: facility.name,
    type: facility.type,
    capacity: typeof facility.capacity === 'string' ? parseInt(facility.capacity) : facility.capacity,
    location: locationObj,
    amenities: Array.isArray(facility.amenities) 
      ? facility.amenities 
      : facility.amenities.split(',').map(a => a.trim()).filter(Boolean),
    equipment: facility.equipment || [],
  };
}

/**
 * Format location for display
 */
export function formatLocation(location: Location | string | undefined): string {
  if (!location) return '';
  if (typeof location === 'string') return location;
  
  const parts = [location.building];
  if (location.floor) parts.push(`Floor ${location.floor}`);
  if (location.room) parts.push(`Room ${location.room}`);
  return parts.join(', ');
}

