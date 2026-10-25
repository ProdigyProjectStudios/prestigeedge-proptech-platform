"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Building, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Inquiry } from "@shared/schema";

export function ClientInquiries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's inquiries
  const { data: inquiries, isLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries"],
  });

  // Delete inquiry mutation
  const deleteInquiryMutation = useMutation({
    mutationFn: async (inquiryId: string) => {
      await apiRequest("DELETE", `/api/inquiries/${inquiryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Inquiry deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete inquiry",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
      in_progress: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: MessageSquare },
      closed: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-luxury-gold" />
      </div>
    );
  }

  if (!inquiries || inquiries.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-luxury-gold mx-auto mb-4 opacity-50" />
        <p className="text-luxury-platinum text-lg">No inquiries yet</p>
        <p className="text-luxury-platinum/60 text-sm">
          Submit inquiries on properties to get in touch with agents
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {inquiries.map((inquiry) => (
        <Card key={inquiry.id} className="bg-luxury-black-medium border-luxury-gold/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4 text-luxury-gold" />
                  <h4 className="text-lg font-semibold text-white">
                    Property Inquiry
                  </h4>
                  {getStatusBadge(inquiry.status)}
                </div>
                <p className="text-luxury-platinum/60 text-sm">
                  Submitted on {format(new Date(inquiry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              
              {inquiry.status === 'open' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteInquiryMutation.mutate(inquiry.id)}
                  disabled={deleteInquiryMutation.isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-luxury-gold font-semibold mb-1">Message</p>
                <p className="text-white bg-luxury-black-light p-3 rounded-lg">
                  {inquiry.message}
                </p>
              </div>

              {inquiry.agentNotes && (
                <div>
                  <p className="text-sm text-luxury-gold font-semibold mb-1">Agent Response</p>
                  <p className="text-white bg-luxury-black-light p-3 rounded-lg">
                    {inquiry.agentNotes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-luxury-platinum/60">Property ID</p>
                  <p className="text-white">{inquiry.propertyId}</p>
                </div>
                <div>
                  <p className="text-luxury-platinum/60">Agent ID</p>
                  <p className="text-white">{inquiry.agentId || "Not assigned"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}