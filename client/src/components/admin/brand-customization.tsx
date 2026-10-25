import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Palette, Globe, Mail, Shield, Code, Save, Eye, Upload } from "lucide-react";
import type { BrandSettings } from "@shared/schema";

const brandSettingsSchema = z.object({
  // Basic branding
  companyName: z.string().min(1, "Company name is required"),
  tagline: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),
  
  // Colors
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  
  // Contact Info
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  
  // Social Media
  socialLinks: z.object({
    facebook: z.string().url().optional().or(z.literal("")),
    instagram: z.string().url().optional().or(z.literal("")),
    linkedin: z.string().url().optional().or(z.literal("")),
    twitter: z.string().url().optional().or(z.literal("")),
    youtube: z.string().url().optional().or(z.literal("")),
  }).optional(),
  
  // Content
  aboutText: z.string().optional(),
  footerText: z.string().optional(),
  
  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  googleAnalyticsId: z.string().optional(),
  
  // Legal
  termsUrl: z.string().url().optional().or(z.literal("")),
  privacyUrl: z.string().url().optional().or(z.literal("")),
  
  // Advanced
  customCss: z.string().optional(),
  customJs: z.string().optional(),
  
  // Email Templates
  emailTemplates: z.object({
    welcome: z.boolean(),
    inquiryNotification: z.boolean(),
    viewingConfirmation: z.boolean(),
    messageNotification: z.boolean(),
  }).optional(),
  
  // Features
  features: z.object({
    virtualTours: z.boolean(),
    propertyAlerts: z.boolean(),
    messaging: z.boolean(),
    viewingScheduler: z.boolean(),
    socialSharing: z.boolean(),
  }).optional(),
});

type BrandSettingsForm = z.infer<typeof brandSettingsSchema>;

export function BrandCustomization() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [previewMode, setPreviewMode] = useState(false);

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
      faviconUrl: "",
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
        youtube: "",
      },
      aboutText: "",
      footerText: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      googleAnalyticsId: "",
      termsUrl: "",
      privacyUrl: "",
      customCss: "",
      customJs: "",
      emailTemplates: {
        welcome: true,
        inquiryNotification: true,
        viewingConfirmation: true,
        messageNotification: true,
      },
      features: {
        virtualTours: true,
        propertyAlerts: true,
        messaging: true,
        viewingScheduler: true,
        socialSharing: true,
      },
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        companyName: settings.companyName,
        tagline: settings.tagline || "",
        logoUrl: settings.logoUrl || "",
        faviconUrl: settings.faviconUrl || "",
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        contactEmail: settings.contactEmail || "",
        contactPhone: settings.contactPhone || "",
        contactAddress: settings.contactAddress || "",
        socialLinks: settings.socialLinks || {},
        aboutText: settings.aboutText || "",
        footerText: settings.footerText || "",
        metaTitle: settings.metaTitle || "",
        metaDescription: settings.metaDescription || "",
        metaKeywords: settings.metaKeywords || "",
        googleAnalyticsId: settings.googleAnalyticsId || "",
        termsUrl: settings.termsUrl || "",
        privacyUrl: settings.privacyUrl || "",
        customCss: settings.customCss || "",
        customJs: settings.customJs || "",
        emailTemplates: settings.emailTemplates || {
          welcome: true,
          inquiryNotification: true,
          viewingConfirmation: true,
          messageNotification: true,
        },
        features: settings.features || {
          virtualTours: true,
          propertyAlerts: true,
          messaging: true,
          viewingScheduler: true,
          socialSharing: true,
        },
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Brand Customization</h2>
          <p className="text-luxury-platinum mt-1 text-sm md:text-base">
            Customize your platform's branding, colors, and features for easy rebranding
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black w-full sm:w-auto"
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? "Edit Mode" : "Preview"}
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateSettingsMutation.isPending}
            className="bg-luxury-gold text-black hover:bg-luxury-gold/90 w-full sm:w-auto"
          >
            {updateSettingsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="bg-luxury-black-light border-luxury-gold/20 w-full min-w-max flex-wrap md:flex-nowrap h-auto p-1 gap-1">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 py-2 text-xs md:text-sm"
            >
              <Palette className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">General</span>
              <span className="sm:hidden">Gen</span>
            </TabsTrigger>
            <TabsTrigger 
              value="contact" 
              className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 py-2 text-xs md:text-sm"
            >
              <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Contact & Social</span>
              <span className="sm:hidden">Contact</span>
            </TabsTrigger>
            <TabsTrigger 
              value="seo" 
              className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 py-2 text-xs md:text-sm"
            >
              <Globe className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">SEO & Analytics</span>
              <span className="sm:hidden">SEO</span>
            </TabsTrigger>
            <TabsTrigger 
              value="features" 
              className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 py-2 text-xs md:text-sm"
            >
              <Shield className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Features</span>
              <span className="sm:hidden">Feat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 py-2 text-xs md:text-sm"
            >
              <Code className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Advanced</span>
              <span className="sm:hidden">Adv</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <TabsContent value="general" className="space-y-4">
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-luxury-gold">Basic Branding</CardTitle>
                <CardDescription className="text-luxury-platinum">
                  Customize your company name, logo, and brand colors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-luxury-gold text-sm">Company Name</Label>
                    <Input
                      {...form.register("companyName")}
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white text-sm"
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-luxury-gold text-sm">Tagline</Label>
                    <Input
                      {...form.register("tagline")}
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white text-sm"
                      placeholder="Your company tagline"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-luxury-gold">Logo URL</Label>
                    <Input
                      {...form.register("logoUrl")}
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-luxury-gold">Favicon URL</Label>
                    <Input
                      {...form.register("faviconUrl")}
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Brand Colors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          {...form.register("primaryColor")}
                          className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                          placeholder="#FFD700"
                        />
                        <input
                          type="color"
                          {...form.register("primaryColor")}
                          className="h-10 w-20 rounded border border-luxury-gold/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          {...form.register("secondaryColor")}
                          className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                          placeholder="#000000"
                        />
                        <input
                          type="color"
                          {...form.register("secondaryColor")}
                          className="h-10 w-20 rounded border border-luxury-gold/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          {...form.register("accentColor")}
                          className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                          placeholder="#F5F5DC"
                        />
                        <input
                          type="color"
                          {...form.register("accentColor")}
                          className="h-10 w-20 rounded border border-luxury-gold/30"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-luxury-gold">Contact Information</CardTitle>
                <CardDescription className="text-luxury-platinum">
                  Set your business contact details and social media links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-luxury-gold">Contact Email</Label>
                    <Input
                      {...form.register("contactEmail")}
                      type="email"
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-luxury-gold">Contact Phone</Label>
                    <Input
                      {...form.register("contactPhone")}
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-luxury-gold">Business Address</Label>
                  <Textarea
                    {...form.register("contactAddress")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                    placeholder="123 Main Street, Suite 100, City, State 12345"
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Social Media Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Facebook</Label>
                      <Input
                        {...form.register("socialLinks.facebook")}
                        className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Instagram</Label>
                      <Input
                        {...form.register("socialLinks.instagram")}
                        className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                        placeholder="https://instagram.com/yourprofile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">LinkedIn</Label>
                      <Input
                        {...form.register("socialLinks.linkedin")}
                        className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                        placeholder="https://linkedin.com/company/yourcompany"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Twitter</Label>
                      <Input
                        {...form.register("socialLinks.twitter")}
                        className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                        placeholder="https://twitter.com/yourhandle"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">YouTube</Label>
                      <Input
                        {...form.register("socialLinks.youtube")}
                        className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                        placeholder="https://youtube.com/yourchannel"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-luxury-gold">SEO & Analytics</CardTitle>
                <CardDescription className="text-luxury-platinum">
                  Optimize your site for search engines and track visitor analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-luxury-gold">Meta Title</Label>
                  <Input
                    {...form.register("metaTitle")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                    placeholder="Your Site Title - Luxury Real Estate"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-luxury-gold">Meta Description</Label>
                  <Textarea
                    {...form.register("metaDescription")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                    placeholder="A compelling description of your real estate services..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-luxury-gold">Meta Keywords</Label>
                  <Input
                    {...form.register("metaKeywords")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                    placeholder="luxury real estate, premium properties, real estate agency"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-luxury-gold">Google Analytics ID</Label>
                  <Input
                    {...form.register("googleAnalyticsId")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-luxury-gold">Terms of Service URL</Label>
                    <Input
                      {...form.register("termsUrl")}
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                      placeholder="https://example.com/terms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-luxury-gold">Privacy Policy URL</Label>
                    <Input
                      {...form.register("privacyUrl")}
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                      placeholder="https://example.com/privacy"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-luxury-gold">Platform Features</CardTitle>
                <CardDescription className="text-luxury-platinum">
                  Enable or disable platform features and email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-4 md:p-6">
                <div className="space-y-4">
                  <h3 className="text-base md:text-lg font-semibold text-white">Feature Toggles</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 p-3 bg-luxury-black-medium rounded-lg">
                      <div className="flex-1">
                        <Label className="text-white text-sm md:text-base">Virtual Tours</Label>
                        <p className="text-xs md:text-sm text-luxury-platinum">Enable virtual property tours</p>
                      </div>
                      <Switch {...form.register("features.virtualTours")} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 p-3 bg-luxury-black-medium rounded-lg">
                      <div className="flex-1">
                        <Label className="text-white text-sm md:text-base">Property Alerts</Label>
                        <p className="text-xs md:text-sm text-luxury-platinum">Email alerts for new properties</p>
                      </div>
                      <Switch {...form.register("features.propertyAlerts")} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 p-3 bg-luxury-black-medium rounded-lg">
                      <div className="flex-1">
                        <Label className="text-white text-sm md:text-base">Messaging System</Label>
                        <p className="text-xs md:text-sm text-luxury-platinum">Client-agent messaging</p>
                      </div>
                      <Switch {...form.register("features.messaging")} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 p-3 bg-luxury-black-medium rounded-lg">
                      <div className="flex-1">
                        <Label className="text-white text-sm md:text-base">Viewing Scheduler</Label>
                        <p className="text-xs md:text-sm text-luxury-platinum">Property viewing bookings</p>
                      </div>
                      <Switch {...form.register("features.viewingScheduler")} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 p-3 bg-luxury-black-medium rounded-lg">
                      <div className="flex-1">
                        <Label className="text-white text-sm md:text-base">Social Sharing</Label>
                        <p className="text-xs md:text-sm text-luxury-platinum">Share properties on social media</p>
                      </div>
                      <Switch {...form.register("features.socialSharing")} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Email Templates</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Welcome Emails</Label>
                        <p className="text-sm text-luxury-platinum">Send welcome emails to new users</p>
                      </div>
                      <Switch {...form.register("emailTemplates.welcome")} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Inquiry Notifications</Label>
                        <p className="text-sm text-luxury-platinum">Notify agents of new inquiries</p>
                      </div>
                      <Switch {...form.register("emailTemplates.inquiryNotification")} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Viewing Confirmations</Label>
                        <p className="text-sm text-luxury-platinum">Confirm property viewings</p>
                      </div>
                      <Switch {...form.register("emailTemplates.viewingConfirmation")} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Message Notifications</Label>
                        <p className="text-sm text-luxury-platinum">Notify users of new messages</p>
                      </div>
                      <Switch {...form.register("emailTemplates.messageNotification")} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-luxury-gold">Advanced Customization</CardTitle>
                <CardDescription className="text-luxury-platinum">
                  Add custom CSS and JavaScript for advanced customization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-luxury-gold">About Text</Label>
                  <Textarea
                    {...form.register("aboutText")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white font-mono"
                    placeholder="Write about your company..."
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-luxury-gold">Footer Text</Label>
                  <Textarea
                    {...form.register("footerText")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white font-mono"
                    placeholder="Custom footer text..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-luxury-gold">Custom CSS</Label>
                  <Textarea
                    {...form.register("customCss")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white font-mono"
                    placeholder=".custom-class { /* Your CSS here */ }"
                    rows={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-luxury-gold">Custom JavaScript</Label>
                  <Textarea
                    {...form.register("customJs")}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white font-mono"
                    placeholder="// Your JavaScript code here"
                    rows={10}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}