import React, { useEffect, useState } from 'react';
import { Calendar } from './ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Clock, MapPin, Users } from 'lucide-react';
import { apiClient } from '../lib/api';
import { transformFacilityToClient, transformBookingToClient, formatLocation } from '../lib/transformers';
import { Facility, Booking, TimeSlot } from '../types';
import { toast } from 'sonner';

export const FacilityCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch facilities on mount
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const response = await apiClient.get<Facility[]>('/facilities');

        // Normalize facilities response (handles multiple shapes)
        let rawFacilities: any[] = [];
        if (Array.isArray(response)) {
          rawFacilities = response;
        } else if (response && Array.isArray(response.data)) {
          rawFacilities = response.data;
        } else if (response && Array.isArray(response.data?.data)) {
          rawFacilities = response.data.data;
        } else {
          rawFacilities = [];
        }

        const facilitiesList = Array.isArray(rawFacilities)
          ? rawFacilities.map(transformFacilityToClient)
          : [];

        setFacilities(facilitiesList.filter(f => f.isActive !== false));
      } catch (error: any) {
        console.error('Failed to load facilities:', error);
        toast.error('Failed to load facilities: ' + (error.message || 'Unknown error'));
      }
    };
    fetchFacilities();
  }, []);

  // Fetch bookings when month or facility changes
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        let baseQuery = `startDate=${startStr}&endDate=${endStr}&status=approved`;
        if (selectedFacility !== 'all') {
          baseQuery += `&facilityId=${selectedFacility}`;
        }

        // Try an "expanded" request first (backends sometimes support an "all" flag)
        const tryUrls = [
          `/bookings?${baseQuery}&all=true`,   // preferred: server returns bookings across facilities / not user-scoped
          `/bookings?${baseQuery}`             // fallback: original call
        ];

        let raw: any[] = [];
        for (const url of tryUrls) {
          try {
            const resp = await apiClient.get(url);
            // Normalize common shapes
            if (Array.isArray(resp)) {
              raw = resp;
            } else if (resp && Array.isArray(resp.data)) {
              raw = resp.data;
            } else if (resp && Array.isArray(resp.data?.data)) {
              raw = resp.data.data;
            } else {
              raw = [];
            }

            // If we got something useful (non-empty array) break and use it
            if (Array.isArray(raw) && raw.length >= 0) {
              // even an empty array is valid; prefer the first successful response
              break;
            }
          } catch (innerErr) {
            // try next URL
            console.warn(`Bookings fetch failed for ${url}:`, innerErr);
            raw = [];
            continue;
          }
        }

        const bookingsList = Array.isArray(raw) ? raw.map(transformBookingToClient) : [];
        // Important: do not filter bookings by requester/admin here — we want to show approved bookings to everyone
        setBookings(bookingsList);
      } catch (error: any) {
        console.error('Failed to fetch bookings:', error);
        toast.error('Failed to load bookings: ' + (error?.message || 'Unknown error'));
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [currentMonth, selectedFacility]);

  const getBookingsForDate = (date: Date, facilityId?: string): Booking[] => {
    return bookings.filter(booking => {
      const bookingDate = booking.date instanceof Date 
        ? booking.date 
        : new Date(booking.date);
      const isSameDate = bookingDate.toDateString() === date.toDateString();

      const bookingFacilityId = typeof booking.facilityId === 'object'
        ? booking.facilityId._id || booking.facilityId.id
        : booking.facilityId;
      const facilityMatch = !facilityId || facilityId === 'all' || bookingFacilityId === facilityId;

      return isSameDate && facilityMatch && booking.status === 'approved';
    });
  };

  const getBookingsForMonth = (month: Date, facilityId?: string): Date[] => {
    const bookingDates: Date[] = [];
    bookings.forEach(booking => {
      const bookingDate = booking.date instanceof Date 
        ? booking.date 
        : new Date(booking.date);
      const isSameMonth = bookingDate.getMonth() === month.getMonth() && 
                         bookingDate.getFullYear() === month.getFullYear();

      const bookingFacilityId = typeof booking.facilityId === 'object'
        ? booking.facilityId._id || booking.facilityId.id
        : booking.facilityId;
      const facilityMatch = !facilityId || facilityId === 'all' || bookingFacilityId === facilityId;

      if (isSameMonth && facilityMatch && booking.status === 'approved') {
        bookingDates.push(bookingDate);
      }
    });
    return bookingDates;
  };

  // Get all time slots for a specific date and facility
  const getTimeSlotsForDate = (date: Date, facilityId: string): { slot: TimeSlot; booking: Booking }[] => {
    const bookingsForDate = getBookingsForDate(date, facilityId);
    const slots: { slot: TimeSlot; booking: Booking }[] = [];

    bookingsForDate.forEach(booking => {
      const timeSlots = booking.timeSlots && booking.timeSlots.length > 0
        ? booking.timeSlots.filter((ts: any) => typeof ts === 'object' && ts.startTime)
        : [];

      timeSlots.forEach((slot: any) => {
        slots.push({
          slot: {
            id: slot._id || slot.id || '',
            startTime: slot.startTime,
            endTime: slot.endTime
          },
          booking
        });
      });
    });

    slots.sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    return slots;
  };

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate, selectedFacility) : [];
  const bookedDates = getBookingsForMonth(currentMonth, selectedFacility);

  const modifiers = {
    booked: bookedDates
  };

  const modifiersStyles = {
    booked: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl">Facility Calendar</h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedFacility} onValueChange={setSelectedFacility}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Facilities</SelectItem>
              {facilities.map(facility => (
                <SelectItem key={facility._id || facility.id} value={facility._id || facility.id || ''}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>
              Select a date to view bookings and time slots. Highlighted dates have confirmed bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border"
            />
            <div className="mt-4 flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span>Has bookings</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Bookings for {selectedDate ? 
                new Intl.DateTimeFormat('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }).format(selectedDate) : 
                'Selected Date'
              }
            </CardTitle>
            <CardDescription>
              {selectedDateBookings.length} confirmed booking(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Loading...</p>
                </div>
              ) : selectedDateBookings.length > 0 ? (
                selectedDateBookings.map(booking => {
                  const facility = typeof booking.facilityId === 'object'
                    ? booking.facilityId
                    : facilities.find(f => (f._id || f.id) === booking.facilityId);
                  const timeSlots = booking.timeSlots && booking.timeSlots.length > 0
                    ? booking.timeSlots.filter((ts: any) => typeof ts === 'object' && ts.startTime)
                    : [];

                  return (
                    <div key={booking._id || booking.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="text-base">{booking.purpose || booking.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{typeof facility === 'object' ? facility.name : 'Unknown Facility'}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{booking.eventType}</p>
                        </div>
                        <Badge variant="outline">
                          {typeof facility === 'object' ? facility.type.replace('_', ' ') : 'Unknown'}
                        </Badge>
                      </div>

                      {/* Time Slots Display */}
                      {timeSlots.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Time Slots:</p>
                          <div className="flex flex-wrap gap-2">
                            {timeSlots.map((slot: any, idx: number) => (
                              <Badge key={slot.id || slot._id || idx} variant="default" className="pl-2">
                                <Clock className="mr-1 h-3 w-3" />
                                {slot.startTime} - {slot.endTime}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {booking.equipmentRequired && booking.equipmentRequired.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Required Equipment:</p>
                          <div className="flex flex-wrap gap-1">
                            {booking.equipmentRequired.map((equipId: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {equipId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bookings for this date</p>
                  <p className="text-sm">Select a highlighted date to see bookings</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline View for Selected Date */}
      {selectedDate && selectedFacility !== 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>Time Slot Timeline</CardTitle>
            <CardDescription>
              Visual representation of booked time slots for {facilities.find(f => (f._id || f.id) === selectedFacility)?.name || 'selected facility'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const timeSlots = getTimeSlotsForDate(selectedDate, selectedFacility);

              if (timeSlots.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No time slots booked for this facility on this date</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {timeSlots.map((item, index) => (
                    <div
                      key={`${item.booking._id || item.booking.id}-${item.slot.id}-${index}`}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2 min-w-[140px]">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {item.slot.startTime} - {item.slot.endTime}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{item.booking.purpose || item.booking.title}</p>
                        <p className="text-xs text-muted-foreground">{item.booking.eventType}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {(() => {
                          const [startHour] = item.slot.startTime.split(':').map(Number);
                          const [endHour] = item.slot.endTime.split(':').map(Number);
                          const duration = endHour - startHour;
                          return `${duration}h`;
                        })()}
                      </Badge>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Facility Overview with Time Slot Details */}
      <Card>
        <CardHeader>
          <CardTitle>Facility Overview</CardTitle>
          <CardDescription>
            Available facilities and their booking status for{" "}
            {selectedDate ? selectedDate.toLocaleDateString() : "selected date"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {facilities.map((facility) => {
              const facilityId = facility._id || facility.id || "";
              const facilityBookings = selectedDate
                ? getBookingsForDate(selectedDate, facilityId)
                : [];
              const timeSlots = selectedDate
                ? getTimeSlotsForDate(selectedDate, facilityId)
                : [];
              const isBooked = facilityBookings.length > 0;

              return (
                <div key={facilityId} className="p-4 border rounded-lg">
                  {/* Facility Info */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-base">{facility.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{formatLocation(facility.location)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{facility.capacity}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={isBooked ? "destructive" : "default"}>
                      {isBooked
                        ? `${timeSlots.length} slot${timeSlots.length > 1 ? "s" : ""}`
                        : "Available"}
                    </Badge>
                  </div>

                  {/* Time Slots and Booking Info */}
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {timeSlots.length > 0 ? "Booked Time Slots:" : "No bookings today"}
                    </p>

                    {timeSlots.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {timeSlots.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm border rounded-md p-2"
                          >
                            <div className="flex items-center space-x-2">
                              <Clock className="h-3 w-3 text-primary" />
                              <span>
                                {item.slot.startTime} - {item.slot.endTime}
                              </span>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              {item.booking.purpose || item.booking.title || "Booking"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amenities and Equipment */}
                  <div className="space-y-1 text-xs text-muted-foreground mt-3">
                    <p>
                      Amenities:{" "}
                      {(facility.amenities && facility.amenities.length > 0)
                        ? facility.amenities.join(", ")
                        : "None"}
                    </p>
                    {facility.equipment?.length > 0 && (
                      <p>
                        Equipment: {facility.equipment.map((eq) => eq.name).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
