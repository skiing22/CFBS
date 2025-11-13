import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CalendarDays, Building2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiClient } from '../lib/api';
import { transformFacilityToClient, transformBookingToClient, formatLocation } from '../lib/transformers';
import { Booking, Facility } from '../types';
import { toast } from 'sonner';

export const Dashboard: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        // --- Facilities ---
        // Admins: request admin-only facilities from backend
        // Non-admins: request all facilities (for the Total Facilities card)
        let facilitiesRes;
        if (isAdmin) {
          facilitiesRes = await apiClient.get('/facilities?adminOnly=true');
        } else {
          facilitiesRes = await apiClient.get('/facilities');
        }

        // Normalize facility response shape
        let facilitiesRaw: any[] = [];
        if (Array.isArray(facilitiesRes)) {
          facilitiesRaw = facilitiesRes;
        } else if (facilitiesRes && Array.isArray(facilitiesRes.data)) {
          facilitiesRaw = facilitiesRes.data;
        } else if (facilitiesRes && Array.isArray(facilitiesRes.data?.data)) {
          facilitiesRaw = facilitiesRes.data.data;
        } else {
          facilitiesRaw = [];
        }

        const facilitiesList: Facility[] = facilitiesRaw.map(transformFacilityToClient);
        setFacilities(facilitiesList);

        // --- Bookings ---
        if (isAdmin) {
          // For admins: fetch bookings only for the admin-owned facilities we just loaded
          const facilityIds = facilitiesList.map((f) => f._id || f.id || '').filter(Boolean);

          // If there are no admin facilities, set bookings to empty
          if (!facilityIds.length) {
            setBookings([]);
          } else {
            // Fetch bookings in parallel for each facility
            const bookingsPromises = facilityIds.map((id) => apiClient.get(`/bookings?facilityId=${id}`));
            const settled = await Promise.allSettled(bookingsPromises);

            const allBookings: Booking[] = [];
            settled.forEach((r) => {
              if (r.status === 'fulfilled') {
                const value = r.value;
                const dataArray = Array.isArray(value) ? value : (value?.data ?? []);
                if (Array.isArray(dataArray)) {
                  allBookings.push(...dataArray.map(transformBookingToClient));
                }
              }
            });

            setBookings(allBookings);
          }
        } else {
          // For non-admin users: fetch user's own bookings
          const bookingsRes = await apiClient.get('/bookings/my-bookings');
          let bookingsRaw: any[] = [];
          if (Array.isArray(bookingsRes)) {
            bookingsRaw = bookingsRes;
          } else if (bookingsRes && Array.isArray(bookingsRes.data)) {
            bookingsRaw = bookingsRes.data;
          } else if (bookingsRes && Array.isArray(bookingsRes.data?.data)) {
            bookingsRaw = bookingsRes.data.data;
          } else {
            bookingsRaw = [];
          }
          const bookingsList: Booking[] = bookingsRaw.map(transformBookingToClient);
          setBookings(bookingsList);
        }
      } catch (error: any) {
        console.error('Dashboard fetch error:', error);
        toast.error('Failed to load dashboard data: ' + (error?.message || 'Unknown error'));
        setFacilities([]);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, isAdmin]);

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // --- Utility Functions ---
  const getStatusIcon = (status: Booking['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // --- ADMIN DASHBOARD ---
  if (isAdmin) {
    // facilities state already contains admin-owned facilities (because we requested adminOnly=true)
    const adminFacilities = facilities;

    // Filter bookings to those that belong to adminFacilities (defensive)
    const adminFacilityIds = adminFacilities.map((f) => f._id || f.id || '').filter(Boolean);
    const allAdminBookings = bookings.filter((booking) => {
      const facilityId =
        typeof booking.facilityId === 'object'
          ? booking.facilityId._id || booking.facilityId.id
          : booking.facilityId;
      return adminFacilityIds.length === 0 ? false : adminFacilityIds.includes(facilityId);
    });

    const pendingBookings = allAdminBookings.filter((b) => b.status === 'pending');
    const approvedCount = allAdminBookings.filter((b) => b.status === 'approved').length;
    const rejectedCount = allAdminBookings.filter((b) => b.status === 'rejected').length;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl">Admin Dashboard</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Facilities Managed</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{adminFacilities.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-yellow-600">{pendingBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Approved Bookings</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Rejected Bookings</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-red-600">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Facilities</CardTitle>
            <CardDescription>Facilities under your management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {adminFacilities.map((facility) => (
                <div
                  key={facility._id || facility.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="text-base">{facility.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatLocation(facility.location)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Capacity: {facility.capacity}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {facility.type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {pendingBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Pending Requests</CardTitle>
              <CardDescription>Bookings waiting for your approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingBookings.slice(0, 3).map((booking) => {
                  const facility =
                    typeof booking.facilityId === 'object'
                      ? booking.facilityId
                      : facilities.find(
                          (f) => (f._id || f.id) === booking.facilityId
                        );
                  const bookingDate =
                    booking.date instanceof Date
                      ? booking.date
                      : new Date(booking.date);
                  const timeSlots =
                    Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0
                      ? booking.timeSlots.filter(
                          (ts: any) => typeof ts === 'object' && ts.startTime
                        )
                      : [];

                  return (
                    <div
                      key={booking._id || booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm">
                          {booking.purpose || booking.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {typeof facility === 'object'
                            ? facility.name
                            : 'Unknown Facility'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(bookingDate)}
                        </p>
                        {timeSlots.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {timeSlots.map((slot: any, idx: number) => (
                              <Badge
                                key={slot.id || slot._id || idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                {slot.startTime}-{slot.endTime}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // --- REQUESTER DASHBOARD ---
  const userBookings = bookings;
  const pendingCount = userBookings.filter((b) => b.status === 'pending').length;
  const approvedCount = userBookings.filter((b) => b.status === 'approved').length;
  const rejectedCount = userBookings.filter((b) => b.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Facilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{facilities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Approved Bookings</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">My Bookings</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{userBookings.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Recent Bookings</CardTitle>
          <CardDescription>Your booking requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userBookings.map((booking) => {
              const facility =
                typeof booking.facilityId === 'object'
                  ? booking.facilityId
                  : facilities.find((f) => (f._id || f.id) === booking.facilityId);
              const bookingDate =
                booking.date instanceof Date
                  ? booking.date
                  : new Date(booking.date);
              const timeSlots =
                Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0
                  ? booking.timeSlots.filter(
                      (ts: any) => typeof ts === 'object' && ts.startTime
                    )
                  : [];

              return (
                <div
                  key={booking._id || booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(booking.status)}
                    <div className="flex-1">
                      <h4 className="text-sm">{booking.purpose || booking.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {typeof facility === 'object'
                          ? facility.name
                          : 'Unknown Facility'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(bookingDate)}
                      </p>
                      {timeSlots.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {timeSlots.map((slot: any, idx: number) => (
                            <Badge
                              key={slot.id || slot._id || idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              {slot.startTime}-{slot.endTime}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </div>
              );
            })}
            {userBookings.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No bookings yet. Click "Book Facility" to make your first reservation.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
