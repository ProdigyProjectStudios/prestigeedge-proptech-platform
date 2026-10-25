import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarDays, Clock, User, Phone, Mail, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Consultation } from '@shared/schema';

const CONSULTATION_STATUSES = {
  pending: { label: 'Pending', color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' },
  rescheduled: { label: 'Rescheduled', color: 'bg-purple-500' },
};

export function Consultations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);

  // Fetch consultations
  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ['/api/admin/consultations'],
  });

  // Update consultation status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest('PUT', `/api/admin/consultations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/consultations'] });
      toast({
        title: 'Success',
        description: 'Consultation status updated successfully',
      });
      setStatusUpdateOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update consultation status',
        variant: 'destructive',
      });
    },
  });

  // Delete consultation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/consultations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/consultations'] });
      toast({
        title: 'Success',
        description: 'Consultation deleted successfully',
      });
      setSelectedConsultation(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete consultation',
        variant: 'destructive',
      });
    },
  });

  const handleStatusUpdate = (status: string) => {
    if (!selectedConsultation) return;
    updateStatusMutation.mutate({ id: selectedConsultation.id, status });
  };

  const handleDelete = () => {
    if (!selectedConsultation) return;
    deleteMutation.mutate(selectedConsultation.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-luxury-gold">Loading consultations...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Consultations List */}
      <Card className="lg:col-span-2 bg-luxury-darker border-luxury-gold/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-luxury-gold">
            <CalendarDays className="h-5 w-5" />
            Consultation Bookings
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage client consultation requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {consultations.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No consultations scheduled</p>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation: Consultation) => (
                  <div
                    key={consultation.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedConsultation?.id === consultation.id
                        ? 'border-luxury-gold bg-luxury-gold/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedConsultation(consultation)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{consultation.clientName}</h3>
                        <p className="text-sm text-gray-400">{consultation.consultationType}</p>
                      </div>
                      <Badge className={`${CONSULTATION_STATUSES[consultation.status as keyof typeof CONSULTATION_STATUSES]?.color} text-white`}>
                        {CONSULTATION_STATUSES[consultation.status as keyof typeof CONSULTATION_STATUSES]?.label || consultation.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(consultation.consultationDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="h-4 w-4" />
                        {consultation.timeSlot}
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Mail className="h-4 w-4" />
                        {consultation.clientEmail}
                      </div>
                      {consultation.clientPhone && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="h-4 w-4" />
                          {consultation.clientPhone}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Consultation Details */}
      <Card className="bg-luxury-darker border-luxury-gold/20">
        <CardHeader>
          <CardTitle className="text-luxury-gold">Consultation Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedConsultation ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Client Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <User className="h-4 w-4" />
                    {selectedConsultation.clientName}
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4" />
                    {selectedConsultation.clientEmail}
                  </div>
                  {selectedConsultation.clientPhone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="h-4 w-4" />
                      {selectedConsultation.clientPhone}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">Consultation Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-300">
                    <span className="font-medium">Type:</span> {selectedConsultation.consultationType}
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">Date:</span> {format(new Date(selectedConsultation.consultationDate), 'MMMM dd, yyyy')}
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">Time:</span> {selectedConsultation.timeSlot}
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">Duration:</span> {selectedConsultation.duration || 60} minutes
                  </div>
                </div>
              </div>

              {selectedConsultation.notes && (
                <div>
                  <h3 className="font-semibold text-white mb-2">Notes</h3>
                  <div className="flex items-start gap-2 text-gray-300">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{selectedConsultation.notes}</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-luxury-gold text-black hover:bg-luxury-gold/80">
                        <Edit className="h-4 w-4 mr-2" />
                        Update Status
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-luxury-darker border-luxury-gold/40 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-luxury-gold">Update Consultation Status</DialogTitle>
                        <DialogDescription className="text-gray-300">
                          Change the status of this consultation
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select onValueChange={handleStatusUpdate}>
                          <SelectTrigger className="bg-luxury-black-light border-luxury-gold/40 text-white">
                            <SelectValue placeholder="Select new status" />
                          </SelectTrigger>
                          <SelectContent className="bg-luxury-black-light border-luxury-gold/40">
                            {Object.entries(CONSULTATION_STATUSES).map(([status, config]) => (
                              <SelectItem key={status} value={status} className="text-white hover:bg-luxury-gold/20">
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-luxury-platinum/40 text-center py-8">
              Select a consultation to see details
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}