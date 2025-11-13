import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  MapPin,
  Users,
  Settings,
  Plus,
  Edit,
  Trash2,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiClient } from '../lib/api';
import {
  transformFacilityToClient,
  transformBookingToClient,
  transformFacilityToServer,
  formatLocation,
} from '../lib/transformers';
import { Facility, Booking } from '../types';
import { toast } from 'sonner';

export const FacilityManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [isAddingFacility, setIsAddingFacility] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFacility, setNewFacility] = useState({
    name: '',
    type: '',
    capacity: '',
    location: '',
    amenities: '',
  });

  // Fetch only admin-owned facilities and bookings for them
  const fetchAdminFacilitiesAndBookings = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      setLoading(true);

      // Request admin-only facilities
      const res = await apiClient.get('/facilities?adminOnly=true');

      // Normalize response into array
      let rawFacilities: any[] = [];
      if (Array.isArray(res)) {
        rawFacilities = res;
      } else if (res && Array.isArray(res.data)) {
        rawFacilities = res.data;
      } else if (res && Array.isArray(res.data?.data)) {
        rawFacilities = res.data.data;
      } else {
        rawFacilities = [];
      }

      const facilitiesList: Facility[] = rawFacilities.map(transformFacilityToClient);

      setFacilities(facilitiesList);

      // Fetch bookings for these facilities (parallel)
      const facilityIds = facilitiesList.map((f) => f._id || f.id || '');
      const bookingRequests = facilityIds.map((id) => apiClient.get(`/bookings?facilityId=${id}`));
      const settled = await Promise.allSettled(bookingRequests);

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
    } catch (err: any) {
      console.error('Failed to load admin facilities/bookings:', err);
      toast.error('Failed to load facilities: ' + (err?.message || 'Unknown error'));
      setFacilities([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchAdminFacilitiesAndBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'admin') {
    return <div>Access denied. Admin privileges required.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading facilities...</p>
        </div>
      </div>
    );
  }

  const getFacilityStats = (facilityId: string) => {
    const facilityBookings = bookings.filter((b) => {
      const id =
        typeof b.facilityId === 'object'
          ? b.facilityId._id || b.facilityId.id
          : b.facilityId;
      return id === facilityId;
    });
    return {
      approved: facilityBookings.filter((b) => b.status === 'approved').length,
      pending: facilityBookings.filter((b) => b.status === 'pending').length,
      rejected: facilityBookings.filter((b) => b.status === 'rejected').length,
      total: facilityBookings.length,
    };
  };

  const handleAddFacility = async () => {
    if (!newFacility.name || !newFacility.type || !newFacility.capacity || !newFacility.location) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const facilityData = transformFacilityToServer(newFacility);
      const res = await apiClient.post('/facilities', facilityData);
      if (res && res.success && res.data) {
        // After creating, re-fetch admin facilities (server should have set adminId and user.managedFacilities)
        await fetchAdminFacilitiesAndBookings();
        toast.success('Facility added successfully!');
        setIsAddingFacility(false);
        setNewFacility({ name: '', type: '', capacity: '', location: '', amenities: '' });
      } else {
        throw new Error(res?.message || 'Failed to create facility');
      }
    } catch (err: any) {
      console.error('Add facility error:', err);
      toast.error('Failed to add facility: ' + (err?.message || err));
    }
  };

  const handleEditFacility = async (facility: Facility) => {
    if (!editingFacility) return;
    try {
      const id = editingFacility._id || editingFacility.id;
      const res = await apiClient.put(`/facilities/${id}`, {
        name: editingFacility.name,
        capacity: editingFacility.capacity,
        location: editingFacility.location,
        amenities: editingFacility.amenities,
      });
      if (res && res.success && res.data) {
        // Refresh the list to keep server-authoritative data
        await fetchAdminFacilitiesAndBookings();
        toast.success('Facility updated successfully!');
        setEditingFacility(null);
      } else {
        throw new Error(res?.message || 'Failed to update facility');
      }
    } catch (err: any) {
      console.error('Edit facility error:', err);
      toast.error('Failed to update: ' + (err?.message || err));
    }
  };

  const handleDeleteFacility = async (id: string) => {
    if (!confirm('Delete this facility?')) return;
    try {
      const res = await apiClient.delete(`/facilities/${id}`);
      if (res && res.success) {
        // Refresh admin facilities/bookings
        await fetchAdminFacilitiesAndBookings();
        toast.success('Facility deleted');
      } else {
        throw new Error(res?.message || 'Failed to delete facility');
      }
    } catch (err: any) {
      console.error('Delete facility error:', err);
      toast.error('Failed to delete: ' + (err?.message || err));
    }
  };

  const FacilityCard: React.FC<{ facility: Facility }> = ({ facility }) => {
    const stats = getFacilityStats(facility._id || facility.id || '');
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{facility.name}</CardTitle>
              <CardDescription>{formatLocation(facility.location)}</CardDescription>
            </div>
            <Badge variant="outline">{facility.type.replace('_', ' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Capacity: {facility.capacity}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{formatLocation(facility.location)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{stats.total} total bookings</span>
            </div>
          </div>

          <div>
            <Label className="text-sm">Amenities:</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {(facility.amenities || []).map((a) => (
                <Badge key={a} variant="secondary" className="text-xs">
                  {a}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm">Available Equipment:</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {facility.equipment?.length ? (
                facility.equipment.map((e) => (
                  <Badge key={e._id || e.id} variant="outline" className="text-xs">
                    {e.name}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No equipment available</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-sm">
            <div>
              <div className="text-lg text-green-600">{stats.approved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
            <div>
              <div className="text-lg text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div>
              <div className="text-lg text-red-600">{stats.rejected}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          </div>

          <div className="flex space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setEditingFacility(facility)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteFacility(facility._id || facility.id || '')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Facility Management</h2>
        <Dialog open={isAddingFacility} onOpenChange={setIsAddingFacility}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Facility</DialogTitle>
              <DialogDescription>Create a new facility that you will manage.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Label>Facility Name *</Label>
              <Input value={newFacility.name} onChange={(e) => setNewFacility((p) => ({ ...p, name: e.target.value }))} />
              <Label>Type *</Label>
              <Select value={newFacility.type} onValueChange={(v) => setNewFacility((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seminar_hall">Seminar Hall</SelectItem>
                  <SelectItem value="auditorium">Auditorium</SelectItem>
                  <SelectItem value="conference_room">Conference Room</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>

                  
                </SelectContent>
              </Select>
              <Label>Capacity *</Label>
              <Input type="number" value={newFacility.capacity} onChange={(e) => setNewFacility((p) => ({ ...p, capacity: e.target.value }))} />
              <Label>Location *</Label>
              <Input value={newFacility.location} onChange={(e) => setNewFacility((p) => ({ ...p, location: e.target.value }))} />
              <Label>Amenities</Label>
              <Textarea value={newFacility.amenities} onChange={(e) => setNewFacility((p) => ({ ...p, amenities: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingFacility(false)}>Cancel</Button>
              <Button onClick={handleAddFacility}>Add Facility</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="facilities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="facilities">My Facilities ({facilities.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="facilities">
          {facilities.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {facilities.map((f) => (
                <FacilityCard key={f._id || f.id} facility={f} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-10">
                <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">No facilities yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Facility Performance</CardTitle>
              <CardDescription>Booking statistics for your facilities</CardDescription>
            </CardHeader>
            <CardContent>
              {facilities.map((f) => {
                const s = getFacilityStats(f._id || f.id || '');
                const rate = s.total ? Math.round((s.approved / s.total) * 100) : 0;
                return (
                  <div key={f._id || f.id} className="flex justify-between border p-4 rounded-lg mb-2">
                    <div>
                      <h4 className="text-base">{f.name}</h4>
                      <p className="text-sm text-muted-foreground">{f.type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p><span className="text-green-600">{s.approved}</span> / {s.total} ({rate}%)</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingFacility && (
        <Dialog open={!!editingFacility} onOpenChange={() => setEditingFacility(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Facility</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input value={editingFacility.name} onChange={(e) => setEditingFacility((p) => p ? { ...p, name: e.target.value } : null)} />
              <Input type="number" value={editingFacility.capacity} onChange={(e) => setEditingFacility((p) => p ? { ...p, capacity: parseInt(e.target.value) || 0 } : null)} />
              <Textarea value={(editingFacility.amenities || []).join(', ')} onChange={(e) => setEditingFacility((p) => p ? { ...p, amenities: e.target.value.split(',').map(a => a.trim()) } : null)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFacility(null)}>Cancel</Button>
              <Button onClick={() => handleEditFacility(editingFacility)}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
