import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { CalendarDays, Clock, MapPin, User, Home, Trash2, Edit, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { PropertyViewing, Property } from '@shared/schema';

const scheduleViewingSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
  agentId: z.string().min(1, 'Please select an agent'),
  viewingDate: z.date({
    required_error: 'Please select a date',
  }).refine((date) => isAfter(date, new Date()), {
    message: 'Viewing date must be in the future',
  }),
  timeSlot: z.string().min(1, 'Please select a time slot'),
  notes: z.string().optional(),
});

type ScheduleViewingData = z.infer<typeof scheduleViewingSchema>;

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

const VIEWING_STATUSES = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' },
  rescheduled: { label: 'Rescheduled', color: 'bg-yellow-500' },
};

export function Viewings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedViewing, setSelectedViewing] = useState<PropertyViewing | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const form = useForm<ScheduleViewingData>({
    resolver: zodResolver(scheduleViewingSchema),
    defaultValues: {
      propertyId: '',
      agentId: '',
      timeSlot: '',
      notes: '',
    },
  });

  // Fetch viewings
  const { data: viewings = [], isLoading } = useQuery<PropertyViewing[]>({
    queryKey: ['/api/viewings'],
  });

  // Fetch properties for selection
  const { data: propertiesData } = useQuery({
    queryKey: ['/api/properties', { limit: 100 }],
    enabled: isScheduleOpen,
  });

  const properties = (propertiesData as any)?.properties || [];

  // Schedule viewing mutation
  const scheduleViewingMutation = useMutation({
    mutationFn: (data: ScheduleViewingData) => {
      const dateTime = new Date(data.viewingDate);
      const [time, period] = data.timeSlot.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      dateTime.setHours(hour, parseInt(minutes), 0, 0);

      return apiRequest('/api/viewings', 'POST', {
        propertyId: data.propertyId,
        agentId: data.agentId,
        viewingDate: dateTime.toISOString(),
        notes: data.notes,
        status: 'scheduled',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Property viewing scheduled successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/viewings'] });
      form.reset();
      setIsScheduleOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule viewing',
        variant: 'destructive',
      });
    },
  });

  // Update viewing mutation
  const updateViewingMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest(`/api/viewings/${id}`, 'PATCH', { status }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Viewing updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/viewings'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update viewing',
        variant: 'destructive',
      });
    },
  });

  // Delete viewing mutation
  const deleteViewingMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/viewings/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Viewing cancelled successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/viewings'] });
      setSelectedViewing(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel viewing',
        variant: 'destructive',
      });
    },
  });

  const handleScheduleViewing = (data: ScheduleViewingData) => {
    scheduleViewingMutation.mutate(data);
  };

  const getViewingProperty = (viewing: PropertyViewing) => {
    // In a real app, we'd join this data from the backend
    return properties.find((p: Property) => p.id === viewing.propertyId);
  };

  const upcomingViewings = viewings.filter(
    (v) => v.status === 'scheduled' && isAfter(new Date(v.viewingDate), new Date())
  );

  const pastViewings = viewings.filter(
    (v) => v.status !== 'scheduled' || isBefore(new Date(v.viewingDate), new Date())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Viewings List */}
      <Card className="lg:col-span-2 bg-luxury-darker border-luxury-gold/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-luxury-gold">
              <CalendarDays className="h-5 w-5" />
              Property Viewings
            </CardTitle>
            <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-luxury-gold text-black hover:bg-luxury-gold/80">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Viewing
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm bg-luxury-darker border-2 border-luxury-gold text-white max-h-[90vh] overflow-hidden">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-luxury-gold text-xl font-semibold">Schedule Property Viewing</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Book a time to view a property with an agent
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(90vh-200px)] overflow-y-auto pr-4">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleScheduleViewing)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300 font-medium">Property</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-luxury-black-light border-luxury-gold/40 text-white hover:border-luxury-gold/60">
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-luxury-black-light border-luxury-gold/40">
                              {properties
                                .filter((p: Property) => p.status === 'available')
                                .map((p: Property) => (
                                  <SelectItem key={p.id} value={p.id} className="text-white hover:bg-luxury-gold/20">
                                    {p.title} - ${p.price.toLocaleString()}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agentId"
                      render={({ field }) => {
                        const selectedProperty = properties.find(
                          (p: Property) => p.id === form.watch('propertyId')
                        );
                        return (
                          <FormItem>
                            <FormLabel className="text-gray-300 font-medium">Agent</FormLabel>
                            <FormControl>
                              <Input
                                value={selectedProperty?.agentName || 'Property agent will be assigned'}
                                disabled
                                className="bg-luxury-black-medium border-luxury-gold/30 text-gray-400"
                              />
                            </FormControl>
                            <input
                              type="hidden"
                              {...field}
                              value={selectedProperty?.agentId || ''}
                            />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="viewingDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-gray-300 font-medium">Date</FormLabel>
                          <div className="bg-luxury-black-light border border-luxury-gold/40 rounded-md p-3">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                isBefore(date, startOfDay(new Date())) ||
                                date.getDay() === 0 // Disable Sundays
                              }
                              initialFocus
                              className="[&_.rdp-day_focus]:bg-luxury-gold [&_.rdp-day_focus]:text-black [&_.rdp-day_selected]:bg-luxury-gold [&_.rdp-day_selected]:text-black [&_.rdp-day]:text-luxury-platinum [&_.rdp-day_disabled]:text-luxury-platinum/30 [&_.rdp-head_cell]:text-luxury-platinum/60 [&_.rdp-caption]:text-luxury-gold"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timeSlot"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300 font-medium">Time Slot</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-luxury-black-light border-luxury-gold/40 text-white hover:border-luxury-gold/60">
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-luxury-black-light border-luxury-gold/40">
                              {TIME_SLOTS.map((slot) => (
                                <SelectItem key={slot} value={slot} className="text-white hover:bg-luxury-gold/20">
                                  {slot}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300 font-medium">Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any special requests or notes"
                              className="min-h-[80px] bg-luxury-black-light border-luxury-gold/40 text-white placeholder:text-gray-500 hover:border-luxury-gold/60"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={scheduleViewingMutation.isPending}
                        className="bg-luxury-gold text-black hover:bg-luxury-gold/80"
                      >
                        {scheduleViewingMutation.isPending ? 'Scheduling...' : 'Schedule Viewing'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-luxury-platinum/40 py-8">
              Loading viewings...
            </div>
          ) : viewings.length === 0 ? (
            <div className="text-center text-luxury-platinum/40 py-8">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No viewings scheduled yet</p>
              <p className="text-sm mt-2">Click "Schedule Viewing" to book your first property tour</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Viewings */}
              {upcomingViewings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 text-luxury-gold">Upcoming Viewings</h3>
                  <div className="space-y-3">
                    {upcomingViewings.map((viewing) => {
                      const property = getViewingProperty(viewing);
                      return (
                        <Card
                          key={viewing.id}
                          className="cursor-pointer hover:shadow-md transition-shadow bg-luxury-dark border-luxury-gold/20"
                          onClick={() => setSelectedViewing(viewing)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    className={VIEWING_STATUSES[viewing.status as keyof typeof VIEWING_STATUSES]?.color}
                                  >
                                    {VIEWING_STATUSES[viewing.status as keyof typeof VIEWING_STATUSES]?.label}
                                  </Badge>
                                  <span className="text-sm text-luxury-platinum/60">
                                    {format(new Date(viewing.viewingDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                <h4 className="font-medium mb-1 text-luxury-platinum">
                                  {property?.title || 'Property'}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-luxury-platinum/60">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(viewing.viewingDate), 'h:mm a')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {property?.location || 'Location'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateViewingMutation.mutate({
                                      id: viewing.id,
                                      status: 'cancelled',
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Past Viewings */}
              {pastViewings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 text-luxury-gold">Past Viewings</h3>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {pastViewings.map((viewing) => {
                        const property = getViewingProperty(viewing);
                        return (
                          <Card
                            key={viewing.id}
                            className="cursor-pointer opacity-75 hover:opacity-100 transition-opacity bg-luxury-dark border-luxury-gold/20"
                            onClick={() => setSelectedViewing(viewing)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge
                                      variant="outline"
                                      className={VIEWING_STATUSES[viewing.status as keyof typeof VIEWING_STATUSES]?.color}
                                    >
                                      {VIEWING_STATUSES[viewing.status as keyof typeof VIEWING_STATUSES]?.label}
                                    </Badge>
                                    <span className="text-sm text-luxury-platinum/60">
                                      {format(new Date(viewing.viewingDate), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  <h4 className="font-medium text-luxury-platinum">
                                    {property?.title || 'Property'}
                                  </h4>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Viewing Details */}
      <Card className="bg-luxury-darker border-luxury-gold/20">
        <CardHeader>
          <CardTitle className="text-luxury-gold">Viewing Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedViewing ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-luxury-platinum/60">Status</p>
                <Badge
                  className={VIEWING_STATUSES[selectedViewing.status as keyof typeof VIEWING_STATUSES]?.color}
                >
                  {VIEWING_STATUSES[selectedViewing.status as keyof typeof VIEWING_STATUSES]?.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-luxury-platinum/60">Date & Time</p>
                <p className="font-medium text-luxury-platinum">
                  {format(new Date(selectedViewing.viewingDate), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-luxury-platinum/80">
                  {format(new Date(selectedViewing.viewingDate), 'h:mm a')}
                </p>
              </div>
              <div>
                <p className="text-sm text-luxury-platinum/60">Property</p>
                <p className="font-medium text-luxury-platinum">
                  {getViewingProperty(selectedViewing)?.title || 'Property Details'}
                </p>
              </div>
              {selectedViewing.notes && (
                <div>
                  <p className="text-sm text-luxury-platinum/60">Notes</p>
                  <p className="text-sm text-luxury-platinum/80">{selectedViewing.notes}</p>
                </div>
              )}
              {selectedViewing.status === 'scheduled' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-luxury-gold/20 text-luxury-platinum hover:bg-luxury-gold/10"
                    onClick={() => updateViewingMutation.mutate({
                      id: selectedViewing.id,
                      status: 'cancelled',
                    })}
                  >
                    Cancel Viewing
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-luxury-platinum/40 text-center py-8">
              Select a viewing to see details
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}