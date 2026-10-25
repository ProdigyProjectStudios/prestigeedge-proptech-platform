"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Palette, Globe, Mail, Image, FileText, Crown, Loader2 } from "lucide-react";
import type { BrandSettings } from "@shared/schema";

const brandSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  tagline: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().url().optional().or(z.literal("")),
    instagram: z.string().url().optional().or(z.literal("")),
    linkedin: z.string().url().optional().or(z.literal("")),
    twitter: z.string().url().optional().or(z.literal("")),
  }).optional(),
  aboutText: z.string().optional(),
  termsUrl: z.string().url().optional().or(z.literal("")),
  privacyUrl: z.string().url().optional().or(z.literal("")),
  customCss: z.string().optional(),
});

type BrandSettingsForm = z.infer<typeof brandSettingsSchema>;

export function BrandSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch brand settings
  const { data: settings, isLoading } = useQuery<BrandSettings>({
    queryKey: ["/api/brand-settings"],
  });

  const form = useForm<BrandSettingsForm>({
    resolver: zodResolver(brandSettingsSchema),
    defaultValues: {
      companyName: "PrestigeEdge",
      tagline: "Luxury Real Estate Excellence",
      logoUrl: "",
      primaryColor: "#FFD700",
      secondaryColor: "#000000",
      accentColor: "#F5F5DC",
      contactEmail: "",
      contactPhone: "",
      contactAddress: "",
      socialLinks: {
        facebook: "",
        instagram: "",
        linkedin: "",
        twitter: "",
      },
      aboutText: "",
      termsUrl: "",
      privacyUrl: "",
      customCss: "",
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        companyName: settings.companyName,
        tagline: settings.tagline || "",
        logoUrl: settings.logoUrl || "",
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        contactEmail: settings.contactEmail || "",
        contactPhone: settings.contactPhone || "",
        contactAddress: settings.contactAddress || "",
        socialLinks: (settings.socialLinks as any) || {
          facebook: "",
          instagram: "",
          linkedin: "",
          twitter: "",
        },
        aboutText: settings.aboutText || "",
        termsUrl: settings.termsUrl || "",
        privacyUrl: settings.privacyUrl || "",
        customCss: settings.customCss || "",
      });
    }
  }, [settings, form]);

  // Update brand settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: BrandSettingsForm) => {
      await apiRequest("PUT", "/api/brand-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-settings"] });
      toast({
        title: "Success",
        description: "Brand settings updated successfully. Refresh the page to see changes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update brand settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BrandSettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-luxury-gold" />
      </div>
    );
  }

  return (
    <Card className="bg-luxury-black-light border-luxury-gold/20">
      <CardHeader>
        <CardTitle className="text-2xl text-white flex items-center gap-2">
          <Crown className="h-6 w-6 text-luxury-gold" />
          Brand Customization
        </CardTitle>
        <CardDescription className="text-luxury-platinum">
          Customize your platform's branding, colors, and contact information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-luxury-black-medium border border-luxury-gold/20">
                <TabsTrigger value="general" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
                  <Crown className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="colors" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
                  <Palette className="h-4 w-4 mr-2" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="contact" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </TabsTrigger>
                <TabsTrigger value="social" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
                  <Globe className="h-4 w-4 mr-2" />
                  Social
                </TabsTrigger>
                <TabsTrigger value="content" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
                  <FileText className="h-4 w-4 mr-2" />
                  Content
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormDescription className="text-luxury-platinum/60">
                        Your company or brand name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Tagline</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormDescription className="text-luxury-platinum/60">
                        A short memorable phrase about your business
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Logo URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com/logo.png" className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormDescription className="text-luxury-platinum/60">
                        URL to your company logo image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="colors" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-luxury-gold">Primary Color</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                          </FormControl>
                          <Input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-12 h-10 cursor-pointer"
                          />
                        </div>
                        <FormDescription className="text-luxury-platinum/60">
                          Main brand color (default: gold)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-luxury-gold">Secondary Color</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                          </FormControl>
                          <Input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-12 h-10 cursor-pointer"
                          />
                        </div>
                        <FormDescription className="text-luxury-platinum/60">
                          Secondary brand color (default: black)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accentColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-luxury-gold">Accent Color</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                          </FormControl>
                          <Input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-12 h-10 cursor-pointer"
                          />
                        </div>
                        <FormDescription className="text-luxury-platinum/60">
                          Accent color for highlights (default: platinum)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Contact Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Contact Phone</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Contact Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="bg-luxury-black-medium border-luxury-gold/30 text-white" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="social" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="socialLinks.facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Facebook URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://facebook.com/yourpage" className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialLinks.instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Instagram URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://instagram.com/yourprofile" className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialLinks.linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">LinkedIn URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://linkedin.com/company/yourcompany" className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialLinks.twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Twitter/X URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://twitter.com/yourhandle" className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="content" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="aboutText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">About Us Text</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="bg-luxury-black-medium border-luxury-gold/30 text-white" rows={5} />
                      </FormControl>
                      <FormDescription className="text-luxury-platinum/60">
                        Brief description of your company for the about section
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termsUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Terms of Service URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com/terms" className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="privacyUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Privacy Policy URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com/privacy" className="bg-luxury-black-medium border-luxury-gold/30 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customCss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxury-gold">Custom CSS (Advanced)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="bg-luxury-black-medium border-luxury-gold/30 text-white font-mono text-sm" 
                          rows={10}
                          placeholder="/* Add custom CSS here */
.custom-class {
  color: #FFD700;
}"
                        />
                      </FormControl>
                      <FormDescription className="text-luxury-platinum/60">
                        Add custom CSS to further customize the appearance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="bg-gold-gradient text-black hover:shadow-lg hover:shadow-luxury-gold/30 font-bold luxury-glow"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}