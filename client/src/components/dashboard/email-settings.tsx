import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Check, X } from "lucide-react";

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.string().min(1, "SMTP port is required"),
  smtpUser: z.string().email("Invalid email address"),
  smtpPass: z.string().min(1, "SMTP password is required"),
  smtpFrom: z.string().email("Invalid from email address"),
  smtpSecure: z.boolean(),
});

type EmailSettings = z.infer<typeof emailSettingsSchema>;

export function EmailSettings() {
  const { toast } = useToast();

  // Get current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings/email'],
  });

  const form = useForm<EmailSettings>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpHost: '',
      smtpPort: '587',
      smtpUser: '',
      smtpPass: '',
      smtpFrom: '',
      smtpSecure: false,
    },
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        smtpHost: settings.smtpHost || '',
        smtpPort: settings.smtpPort || '587',
        smtpUser: settings.smtpUser || '',
        smtpPass: settings.smtpPass || '',
        smtpFrom: settings.smtpFrom || '',
        smtpSecure: settings.smtpSecure || false,
      });
    }
  }, [settings, form]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmailSettings) => {
      const response = await apiRequest('PUT', '/api/settings/email', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/email'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test email mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/settings/email/test');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test email sent successfully! Check your inbox.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailSettings) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-luxury-black-light border-luxury-gold/20 luxury-box-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5 text-luxury-gold" />
            Email Settings
          </CardTitle>
          <CardDescription className="text-luxury-platinum">
            Configure SMTP settings for sending automated emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">SMTP Host</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="smtp.gmail.com" 
                          className="bg-luxury-black-medium border-luxury-gold/20 text-white placeholder:text-gray-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-luxury-platinum">
                        Your email server hostname
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">SMTP Port</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="587" 
                          className="bg-luxury-black-medium border-luxury-gold/20 text-white placeholder:text-gray-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-luxury-platinum">
                        Usually 587 for TLS or 465 for SSL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">SMTP Username</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="your-email@gmail.com" 
                        className="bg-luxury-black-medium border-luxury-gold/20 text-white placeholder:text-gray-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-luxury-platinum">
                      Email address used for authentication
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smtpPass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">SMTP Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="bg-luxury-black-medium border-luxury-gold/20 text-white placeholder:text-gray-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-luxury-platinum">
                      App-specific password for Gmail
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smtpFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">From Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="noreply@prestigeedge.com" 
                        className="bg-luxury-black-medium border-luxury-gold/20 text-white placeholder:text-gray-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-luxury-platinum">
                      The email address that will appear as sender
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smtpSecure"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-luxury-gold/20 bg-luxury-black-medium p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base text-white">
                        Use SSL/TLS
                      </FormLabel>
                      <FormDescription className="text-luxury-platinum">
                        Enable secure connection (recommended)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Button
                        type="button"
                        variant={field.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(!field.value)}
                        className="w-20"
                      >
                        {field.value ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Yes
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            No
                          </>
                        )}
                      </Button>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || updateMutation.isPending}
                  className="border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Test Email
                </Button>

                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gold-gradient text-black hover:shadow-lg hover:shadow-luxury-gold/30 font-bold luxury-glow"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-luxury-black-light border-luxury-gold/20 luxury-box-shadow">
        <CardHeader>
          <CardTitle className="text-luxury-gold">
            Email Service Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-luxury-platinum">
            <p>• Emails are sent for new inquiries, property viewings, and messages</p>
            <p>• For Gmail, use an app-specific password instead of your regular password</p>
            <p>• Test the configuration before saving to ensure it works correctly</p>
            <p>• All email templates are professionally designed with the PrestigeEdge branding</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}