import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Clock,
  MapPin,
  User,
  Calendar,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { apiClient } from "../lib/api";
import { transformBookingToClient } from "../lib/transformers";
import { Booking } from "../types";
import { toast } from "sonner";

export const AdminApprovals: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [approvedBookings, setApprovedBookings] = useState<Booking[]>([]);
  const [rejectedBookings, setRejectedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!currentUser || currentUser.role !== "admin") return;

      try {
        setLoading(true);
        // Fetch pending bookings for admin
        const pendingResponse = await apiClient.get<Booking[]>("/bookings/pending/all");
        if (pendingResponse && pendingResponse.success && Array.isArray(pendingResponse.data)) {
          const bookings = pendingResponse.data.map(transformBookingToClient);
          setPendingBookings(bookings);
        } else {
          setPendingBookings([]);
        }

        // Fetch all bookings for admin's facilities to get approved/rejected
        const managedFacilityIds = Array.isArray(currentUser.managedFacilities)
          ? currentUser.managedFacilities.map((f: any) =>
              typeof f === "object" ? f._id || f.id : f
            )
          : [];

        if (managedFacilityIds.length > 0) {
          const bookingsPromises = managedFacilityIds.map((facilityId: string) =>
            apiClient.get<Booking[]>(`/bookings?facilityId=${facilityId}`)
          );

          const bookingsResponses = await Promise.all(bookingsPromises);
          const allBookings: Booking[] = [];

          bookingsResponses.forEach((response) => {
            if (response && response.success && Array.isArray(response.data)) {
              const bookingsList = response.data.map(transformBookingToClient);
              allBookings.push(...bookingsList);
            }
          });

          setApprovedBookings(allBookings.filter((b) => b.status === "approved"));
          setRejectedBookings(allBookings.filter((b) => b.status === "rejected"));
        } else {
          // If admin has no managed facilities, make lists empty
          setApprovedBookings([]);
          setRejectedBookings([]);
        }
      } catch (error: any) {
        toast.error("Failed to load bookings: " + (error.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [currentUser]);

  if (!currentUser || currentUser.role !== "admin") {
    return <div>Access denied. Admin privileges required.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  const toDate = (d: any) => {
    // Accepts Date or string; fallbacks to new Date()
    try {
      return d instanceof Date ? d : new Date(d);
    } catch {
      return new Date();
    }
  };

  const formatDateTime = (date: Date | string | undefined) => {
    const d = toDate(date);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const formatDate = (date: Date | string | undefined) => {
    const d = toDate(date);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  };

  const handleApprove = async (booking: Booking) => {
    setIsProcessing(true);
    try {
      const bookingId = booking._id || booking.id;
      if (!bookingId) throw new Error("Invalid booking ID");

      const response = await apiClient.put(`/bookings/${bookingId}/approve`, {});

      if (response && response.success) {
        // Use returned booking if available, else fallback
        const updatedBookingRaw = response.data ?? { ...(booking as any), status: "approved" };
        const updatedBooking = transformBookingToClient(updatedBookingRaw);

        // Update UI lists
        setPendingBookings((prev) => prev.filter((b) => (b._id || b.id) !== bookingId));
        setApprovedBookings((prev) => {
          // avoid duplicates
          const exists = prev.some((b) => (b._id || b.id) === bookingId);
          return exists ? prev.map((b) => ((b._id || b.id) === bookingId ? updatedBooking : b)) : [...prev, updatedBooking];
        });

        const requester = typeof updatedBooking.userId === "object" ? updatedBooking.userId : null;
        const requesterEmail = requester?.email || "the requester";
        toast.success(`Booking approved! Confirmation email sent to ${requesterEmail}`, { duration: 5000 });
        setSelectedBooking(null);
      } else {
        throw new Error(response?.message || "Failed to approve booking");
      }
    } catch (error: any) {
      toast.error("Failed to approve booking: " + (error.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (booking: Booking) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setIsProcessing(true);
    try {
      const bookingId = booking._id || booking.id;
      if (!bookingId) throw new Error("Invalid booking ID");

      const response = await apiClient.put(`/bookings/${bookingId}/reject`, {
        reason: rejectionReason,
      });

      if (response && response.success) {
        const updatedBookingRaw = response.data ?? { ...(booking as any), status: "rejected", rejectionReason };
        const updatedBooking = transformBookingToClient(updatedBookingRaw);

        // Update UI lists
        setPendingBookings((prev) => prev.filter((b) => (b._id || b.id) !== bookingId));
        setRejectedBookings((prev) => {
          const exists = prev.some((b) => (b._id || b.id) === bookingId);
          return exists ? prev.map((b) => ((b._id || b.id) === bookingId ? updatedBooking : b)) : [...prev, updatedBooking];
        });

        const requester = typeof updatedBooking.userId === "object" ? updatedBooking.userId : null;
        const requesterEmail = requester?.email || "the requester";
        toast.success(`Booking rejected. Notification email sent to ${requesterEmail}`, { duration: 5000 });

        setRejectionReason("");
        setSelectedBooking(null);
      } else {
        throw new Error(response?.message || "Failed to reject booking");
      }
    } catch (error: any) {
      toast.error("Failed to reject booking: " + (error.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const BookingCard: React.FC<{ booking: Booking; showActions?: boolean }> = ({ booking, showActions = false }) => {
    const facility = typeof booking.facilityId === "object" ? booking.facilityId : null;
    const requester = typeof booking.userId === "object" ? booking.userId : null;

    const facilityName = facility?.name || "Unknown Facility";
    const requesterName = requester?.name || "Unknown User";
    const requesterDept = requester?.department;

    const getStatusColor = (status: Booking["status"]) => {
      switch (status) {
        case "approved":
          return "bg-green-100 text-green-800";
        case "rejected":
          return "bg-red-100 text-red-800";
        case "pending":
          return "bg-yellow-100 text-yellow-800";
        default:
          return "";
      }
    };

    const timeslotsArray = (booking as any).timeslots ?? (booking as any).timeSlots ?? (booking as any).timeSlots ?? [];

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{booking.purpose || (booking as any).title}</CardTitle>
              <CardDescription>{booking.eventType}</CardDescription>
            </div>
            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{facilityName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{requesterName}{requesterDept && ` (${requesterDept})`}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Requested: {formatDateTime(booking.createdAt)}</span>
            </div>
          </div>

          {/* Time Slots Display */}
          {Array.isArray(timeslotsArray) && timeslotsArray.length > 0 ? (
            <div>
              <Label className="text-sm">Time Slots:</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {timeslotsArray.filter((ts: any) => ts && ts.startTime).map((slot: any, idx: number) => (
                  <Badge key={slot.id || slot._id || idx} variant="default" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    {slot.startTime} - {slot.endTime}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {booking.equipmentRequired && booking.equipmentRequired.length > 0 && (
            <div>
              <Label className="text-sm">Required Equipment:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {booking.equipmentRequired.map((equipmentName: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{equipmentName}</Badge>
                ))}
              </div>
            </div>
          )}

          {booking.specialRequests && (
            <div>
              <Label className="text-sm">Additional Notes:</Label>
              <p className="text-sm text-muted-foreground mt-1">{booking.specialRequests}</p>
            </div>
          )}

          {booking.rejectionReason && (
            <div>
              <Label className="text-sm">Rejection Reason:</Label>
              <p className="text-sm text-red-600 mt-1">{booking.rejectionReason}</p>
            </div>
          )}

          {showActions && booking.status === "pending" && (
            <div className="flex space-x-2 pt-4 border-t">
              <Button onClick={() => handleApprove(booking)} className="flex-1" disabled={isProcessing}>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setSelectedBooking(booking)}
                    disabled={isProcessing}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Booking Request</DialogTitle>
                    <DialogDescription>
                      Please provide a reason for rejecting this booking request. The requester will be notified via email.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Booking: {(booking as any).title || booking.purpose}</Label>
                      <p className="text-sm text-muted-foreground">
                        {facility?.name} - {formatDate(booking.date)}
                      </p>
                      {Array.isArray(timeslotsArray) && timeslotsArray.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {timeslotsArray.map((slot: any, idx: number) => (
                            <Badge key={slot.id || slot._id || idx} variant="outline" className="text-xs">
                              {slot.startTime} - {slot.endTime}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for Rejection *</Label>
                      <Textarea
                        id="reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please explain why this booking cannot be approved..."
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setRejectionReason(""); setSelectedBooking(null); }}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={() => handleReject(booking)} disabled={!rejectionReason.trim() || isProcessing}>
                      {isProcessing ? "Rejecting..." : "Reject Booking"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Booking Approvals</h2>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <span className="text-sm text-muted-foreground">{pendingBookings.length} pending approval(s)</span>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingBookings.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedBookings.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingBookings.length > 0 ? (
            <div className="grid gap-4">
              {pendingBookings.map((booking) => (
                <BookingCard key={(booking._id || booking.id)} booking={booking} showActions={true} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Check className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg mb-2">All caught up!</h3>
                <p className="text-muted-foreground text-center">No pending booking requests require your attention.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedBookings.length > 0 ? (
            <div className="grid gap-4">
              {approvedBookings.map((booking) => (
                <BookingCard key={(booking._id || booking.id)} booking={booking} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg mb-2">No approved bookings</h3>
                <p className="text-muted-foreground text-center">Approved bookings will appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedBookings.length > 0 ? (
            <div className="grid gap-4">
              {rejectedBookings.map((booking) => (
                <BookingCard key={(booking._id || booking.id)} booking={booking} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <X className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg mb-2">No rejected bookings</h3>
                <p className="text-muted-foreground text-center">Rejected bookings will appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
