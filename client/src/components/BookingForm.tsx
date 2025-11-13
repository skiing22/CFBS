import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';
import { Calendar as CalendarIcon, Clock, MapPin, Users, CheckCircle, Plus, X } from 'lucide-react';
import { format, startOfDay, isBefore } from 'date-fns';
import { BookingRequest, TimeSlot, Facility, Timeslot } from '../types';
import { useAuth } from './AuthContext';
import { apiClient } from '../lib/api';
import { transformFacilityToClient, transformTimeslotToClient, formatLocation } from '../lib/transformers';
import { toast } from 'sonner';

export const BookingForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookedTimeslots, setBookedTimeslots] = useState<Timeslot[]>([]);
  const [availableTimeslots, setAvailableTimeslots] = useState<Timeslot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [formData, setFormData] = useState({
    purpose: '',
    eventType: 'seminar' as 'seminar' | 'workshop' | 'conference' | 'meeting' | 'sports' | 'cultural' | 'academic' | 'other',
    requiredEquipment: [] as string[],
    additionalNotes: '',
    timeSlots: [] as { startTime: string; endTime: string; id?: string }[]
  });
  const [bookingDate, setBookingDate] = useState<Date>();
  const [currentStartTime, setCurrentStartTime] = useState('09:00');
  const [currentEndTime, setCurrentEndTime] = useState('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch facilities on mount — server returns all facilities by default now.
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        let response = await apiClient.get('/facilities');

        // Normalize response shape
        let raw: any;
        if (Array.isArray(response)) {
          raw = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          raw = response.data;
        } else if (response && Array.isArray(response?.data?.data)) {
          raw = response.data.data;
        } else {
          // fallback
          const fallback = await apiClient.get('/facilities?adminOnly=false');
          raw = Array.isArray(fallback) ? fallback : fallback?.data ?? [];
        }

        const facilitiesList = Array.isArray(raw) ? raw.map(transformFacilityToClient) : [];
        setFacilities(facilitiesList.filter(f => f.isActive !== false));
        console.log('BookingForm loaded facilities:', facilitiesList);
      } catch (error: any) {
        console.error('Failed to load facilities:', error);
        toast.error('Failed to load facilities: ' + (error?.message || 'Unknown error'));
        setFacilities([]);
      }
    };
    fetchFacilities();
  }, []);

  // Fetch timeslots when date/facility changes
  useEffect(() => {
    const fetchTimeslots = async () => {
      if (!bookingDate || !selectedFacility) {
        setBookedTimeslots([]);
        setAvailableTimeslots([]);
        return;
      }

      try {
        setLoading(true);
        const dateStr = format(bookingDate, 'yyyy-MM-dd');
        const response = await apiClient.get<Timeslot[]>(`/timeslots?facilityId=${selectedFacility}&date=${dateStr}`);

        // Normalize timeslots response
        let rawSlots: any[] = [];
        if (Array.isArray(response)) {
          rawSlots = response;
        } else if (response && Array.isArray(response.data)) {
          rawSlots = response.data;
        } else if (response && Array.isArray(response.data?.data)) {
          rawSlots = response.data.data;
        } else {
          rawSlots = [];
        }

        const slots = rawSlots.map(transformTimeslotToClient);
        setBookedTimeslots(slots.filter(ts => ts.isBooked && ts.status === 'booked'));
        setAvailableTimeslots(slots.filter(ts => !ts.isBooked && ts.status === 'available'));
      } catch (error: any) {
        console.error('Failed to fetch timeslots:', error);
        setBookedTimeslots([]);
        setAvailableTimeslots([]);
        toast.error('Failed to load timeslots');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeslots();
  }, [bookingDate, selectedFacility]);

  const selectedFacilityData = facilities.find(f => (f._id || f.id) === selectedFacility);

  // Check for time slot conflicts
  const checkTimeSlotConflict = (newSlot: { startTime: string; endTime: string }): boolean => {
    if (!bookingDate || !selectedFacility) return false;

    for (const bookedSlot of bookedTimeslots) {
      if (
        (newSlot.startTime >= bookedSlot.startTime && newSlot.startTime < bookedSlot.endTime) ||
        (newSlot.endTime > bookedSlot.startTime && newSlot.endTime <= bookedSlot.endTime) ||
        (newSlot.startTime <= bookedSlot.startTime && newSlot.endTime >= bookedSlot.endTime)
      ) {
        return true;
      }
    }

    for (const slot of formData.timeSlots) {
      if (
        (newSlot.startTime >= slot.startTime && newSlot.startTime < slot.endTime) ||
        (newSlot.endTime > slot.startTime && newSlot.endTime <= slot.endTime) ||
        (newSlot.startTime <= slot.startTime && newSlot.endTime >= slot.endTime)
      ) {
        return true;
      }
    }

    return false;
  };

  const handleAddTimeSlot = () => {
    if (currentStartTime >= currentEndTime) {
      toast.error('End time must be after start time');
      return;
    }

    const newSlot = {
      startTime: currentStartTime,
      endTime: currentEndTime
    };

    if (checkTimeSlotConflict(newSlot)) {
      toast.error('This time slot conflicts with an existing booking or another selected slot');
      return;
    }

    const newTimeSlot = {
      id: `ts_${Date.now()}`,
      startTime: currentStartTime,
      endTime: currentEndTime
    };

    setFormData(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, newTimeSlot]
    }));

    toast.success('Time slot added');
  };

  const handleRemoveTimeSlot = (slotId: string) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(slot => slot.id !== slotId)
    }));
  };

  const handleEquipmentChange = (equipmentName: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      requiredEquipment: checked 
        ? [...prev.requiredEquipment, equipmentName]
        : prev.requiredEquipment.filter(name => name !== equipmentName)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic client-side validation
    if (!currentUser) {
      toast.error('You must be logged in to submit a booking');
      return;
    }
    if (!bookingDate || !selectedFacility) {
      toast.error('Please choose a date and facility');
      return;
    }
    if (!formData.timeSlots.length) {
      toast.error('Please add at least one time slot');
      return;
    }
    if (!formData.purpose) {
      toast.error('Please enter a purpose/event title');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare both formats so backend can accept either
      const timeRanges = formData.timeSlots.map(s => ({ startTime: s.startTime, endTime: s.endTime }));
      const timeSlotsPayload = formData.timeSlots.map(s => ({ ...s }));

      // Build payload (include requester info for clarity; backend should ignore unknown fields)
      const payload: any = {
        facilityId: selectedFacility,
        date: format(bookingDate, 'yyyy-MM-dd'),
        timeRanges,         // commonly accepted by server
        timeSlots: timeSlotsPayload, // fallback if server expects timeslot objects
        purpose: formData.purpose,
        eventType: formData.eventType,
        equipmentRequired: formData.requiredEquipment,
        specialRequests: formData.additionalNotes || undefined,
        requesterId: currentUser.id, // helpful if backend needs explicit user id
      };

      // Log payload for debugging (remove or reduce in production)
      console.log('Submitting booking payload:', payload);

      const response = await apiClient.post('/bookings', payload);

      // Normalize response
      const success = !!(response && (response.success === true || response.status === 201 || response.status === 200 || response.data?.success === true));
      const message = response?.message ?? response?.data?.message ?? response?.data?.error ?? response?.data?.msg ?? 'Unknown response';

      if (success) {
        toast.success('Booking request submitted successfully! The facility admin will review your request.', { duration: 5000 });

        // Reset form
        setFormData({
          purpose: '',
          eventType: 'seminar',
          requiredEquipment: [],
          additionalNotes: '',
          timeSlots: []
        });
        setSelectedFacility('');
        setBookingDate(undefined);
        setCurrentStartTime('09:00');
        setCurrentEndTime('11:00');
      } else {
        // If server returned validation/errors, show them
        console.error('Booking failed:', response);
        // try to extract detailed errors
        const detailed = response?.data?.errors ?? response?.data ?? response;
        let errMsg = message;
        if (detailed && typeof detailed === 'object') {
          // try common shapes
          if (Array.isArray(detailed)) errMsg = detailed.map((d: any) => d.message || d).join(', ');
          else if (detailed.message) errMsg = detailed.message;
          else errMsg = JSON.stringify(detailed);
        }
        toast.error('Failed to submit booking: ' + errMsg);
      }
    } catch (err: any) {
      console.error('Booking request error:', err);
      // present helpful messages depending on status
      if (err?.response?.status === 403) {
        toast.error('You are not allowed to create bookings for this facility (forbidden).');
      } else if (err?.response?.status === 401) {
        toast.error('Authentication error. Please log in again.');
      } else {
        toast.error('Failed to submit booking request: ' + (err?.message || 'Unknown error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get booked time slots for display
  const bookedSlots = bookedTimeslots.map(ts => ({
    id: ts._id || ts.id || '',
    startTime: ts.startTime,
    endTime: ts.endTime
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Book a Facility</h2>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Booking Request</CardTitle>
              <CardDescription>
                Fill out the form below to request a facility booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="facility">Facility *</Label>
                    <Select value={selectedFacility} onValueChange={setSelectedFacility} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a facility" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilities.map(facility => (
                          <SelectItem key={facility._id || facility.id} value={facility._id || facility.id || ''}>
                            {facility.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventType">Event Type *</Label>
                    <Select 
                      value={formData.eventType} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, eventType: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seminar">Seminar</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose/Event Title *</Label>
                  <Input
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Enter event title or purpose"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Booking Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingDate ? format(bookingDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={bookingDate}
                        onSelect={setBookingDate}
                        disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Slots Section */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div>
                    <Label className="text-base">Time Slots *</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add one or more time slots for your booking
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={currentStartTime}
                        onChange={(e) => setCurrentStartTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={currentEndTime}
                        onChange={(e) => setCurrentEndTime(e.target.value)}
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleAddTimeSlot}
                        className="w-full"
                        disabled={!bookingDate || !selectedFacility}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Slot
                      </Button>
                    </div>
                  </div>

                  {/* Display added time slots */}
                  {formData.timeSlots.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Selected Time Slots:</Label>
                      <div className="flex flex-wrap gap-2">
                        {formData.timeSlots.map(slot => (
                          <Badge key={slot.id} variant="default" className="pl-3 pr-1 py-1">
                            <Clock className="mr-1 h-3 w-3" />
                            {slot.startTime} - {slot.endTime}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => handleRemoveTimeSlot(slot.id!)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display booked time slots for selected date */}
                  {bookingDate && selectedFacility && bookedSlots.length > 0 && (
                    <div className="space-y-2 pt-3 border-t">
                      <Label className="text-sm text-muted-foreground">
                        Already Booked Time Slots:
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {bookedSlots.map((slot) => (
                          <Badge key={slot.id} variant="destructive" className="pl-3">
                            <Clock className="mr-1 h-3 w-3" />
                            {slot.startTime} - {slot.endTime}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedFacilityData && selectedFacilityData.equipment.length > 0 && (
                  <div className="space-y-2">
                    <Label>Required Equipment</Label>
                    <div className="grid gap-2 md:grid-cols-2">
                    {selectedFacilityData.equipment.map(equipment => (
                      <div key={equipment._id || equipment.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={equipment._id || equipment.id}
                          checked={formData.requiredEquipment.includes(equipment.name)}
                          onCheckedChange={(checked) => 
                            handleEquipmentChange(equipment.name, checked as boolean)
                          }
                        />
                        <Label htmlFor={equipment._id || equipment.id} className="text-sm">
                          {equipment.name} {equipment.quantity && `(${equipment.quantity})`}
                        </Label>
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    placeholder="Any additional requirements or notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Booking Request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedFacilityData && (
            <Card>
              <CardHeader>
                <CardTitle>Facility Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-base">{selectedFacilityData.name}</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{formatLocation(selectedFacilityData.location)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Capacity: {selectedFacilityData.capacity}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Type</Label>
                  <Badge variant="outline" className="ml-2">
                    {selectedFacilityData.type.replace('_', ' ')}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm">Amenities</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFacilityData.amenities.map(amenity => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedFacilityData.equipment.length > 0 && (
                  <div>
                    <Label className="text-sm">Available Equipment</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedFacilityData.equipment.map(equipment => (
                        <Badge key={equipment._id || equipment.id} variant="outline" className="text-xs">
                          {equipment.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Booking Process</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</div>
                <div>
                  <p>Submit your booking request</p>
                  <p className="text-muted-foreground text-xs">Fill out the form with event details</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">2</div>
                <div>
                  <p>Admin review</p>
                  <p className="text-muted-foreground text-xs">Facility admin will review your request</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">3</div>
                <div>
                  <p>Email notification</p>
                  <p className="text-muted-foreground text-xs">You'll receive approval/rejection email</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
