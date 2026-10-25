import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Mail, Send, Trash2, User as UserIcon, Clock, CheckCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Message, User } from '@shared/schema';

const sendMessageSchema = z.object({
  receiverId: z.string().min(1, 'Please select a recipient'),
  subject: z.string().min(1, 'Subject is required').max(200),
  content: z.string().min(1, 'Message content is required').max(2000),
});

type SendMessageData = z.infer<typeof sendMessageSchema>;

export function Messages() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messageType, setMessageType] = useState<'all' | 'sent' | 'received'>('all');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const form = useForm<SendMessageData>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      receiverId: '',
      subject: '',
      content: '',
    },
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/messages', messageType],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/messages?type=${messageType}`);
      return response.json();
    },
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users for recipient selection
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users/messaging'],
    enabled: isComposeOpen,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await apiRequest('POST', '/api/messages', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      form.reset();
      setIsComposeOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest('PATCH', `/api/messages/${messageId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest('DELETE', `/api/messages/${messageId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setSelectedMessage(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete message',
        variant: 'destructive',
      });
    },
  });

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    // Mark as read if user is the receiver and message is unread
    if (message.receiverId === user?.id && !message.isRead) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleSendMessage = (data: SendMessageData) => {
    sendMessageMutation.mutate(data);
  };

  const getMessageParticipant = (message: Message) => {
    if (message.senderId === user?.id) {
      return { id: message.receiverId, role: 'To' };
    }
    return { id: message.senderId, role: 'From' };
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setIsComposeOpen(false)}>
          <div className="bg-luxury-darker border border-luxury-gold/20 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-luxury-gold">New Message</h2>
                <p className="text-sm text-luxury-platinum/60">Send a message to an agent or admin</p>
              </div>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSendMessage)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="receiverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recipient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper" sideOffset={5}>
                              {isLoadingUsers ? (
                                <SelectItem value="loading" disabled>
                                  Loading users...
                                </SelectItem>
                              ) : users.length === 0 ? (
                                <SelectItem value="no-users" disabled>
                                  No users available
                                </SelectItem>
                              ) : (
                                users
                                  .filter((u) => u.id !== user?.id && (u.role === 'admin' || u.role === 'agent'))
                                  .map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.name} ({u.role})
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter subject" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your message"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsComposeOpen(false);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={sendMessageMutation.isPending}
                      >
                        {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                      </Button>
                    </div>
                  </form>
                </Form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <Card className="lg:col-span-1 bg-luxury-darker border-luxury-gold/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-luxury-gold">
                <Mail className="h-5 w-5" />
                Messages
                {unreadData && unreadData.count > 0 && (
                  <Badge className="bg-luxury-gold text-luxury-dark">{unreadData.count}</Badge>
                )}
              </CardTitle>
              <Button size="sm" onClick={() => setIsComposeOpen(true)} className="bg-luxury-gold text-luxury-dark hover:bg-luxury-gold/80">
                <Send className="h-4 w-4 mr-2" />
                Compose
              </Button>
            </div>
          </CardHeader>
        <CardContent className="p-0">
          <Tabs value={messageType} onValueChange={(v) => setMessageType(v as typeof messageType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="received">Inbox</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
            </TabsList>
            <TabsContent value={messageType} className="mt-0">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No messages found
                  </div>
                ) : (
                  <div className="divide-y">
                    {messages.map((message: Message) => {
                      const participant = getMessageParticipant(message);
                      return (
                        <div
                          key={message.id}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedMessage?.id === message.id ? 'bg-muted' : ''
                          } ${!message.isRead && message.receiverId === user?.id ? 'bg-accent/10' : ''}`}
                          onClick={() => handleMessageClick(message)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{participant.role[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium truncate">
                                  {participant.role}: {participant.id.slice(0, 8)}...
                                </p>
                                <div className="flex items-center gap-1">
                                  {message.isRead ? (
                                    <CheckCheck className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <div className="h-2 w-2 bg-primary rounded-full" />
                                  )}
                                </div>
                              </div>
                              <p className="text-sm font-medium truncate mb-1">
                                {message.subject}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Message Detail */}
      <Card className="lg:col-span-2 bg-luxury-darker border-luxury-gold/20">
        {selectedMessage ? (
          <>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-luxury-gold">{selectedMessage.subject}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2 text-luxury-platinum/60">
                    <UserIcon className="h-4 w-4" />
                    {selectedMessage.senderId === user?.id
                      ? `To: ${selectedMessage.receiverId.slice(0, 8)}...`
                      : `From: ${selectedMessage.senderId.slice(0, 8)}...`}
                    <Clock className="h-4 w-4 ml-4" />
                    {format(new Date(selectedMessage.createdAt), 'MMM d, yyyy h:mm a')}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMessageMutation.mutate(selectedMessage.id)}
                  disabled={deleteMessageMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none prose-invert">
                <p className="whitespace-pre-wrap text-luxury-platinum">{selectedMessage.content}</p>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-luxury-platinum/40">
            Select a message to view details
          </div>
        )}
      </Card>
    </div>
    </>
  );
}