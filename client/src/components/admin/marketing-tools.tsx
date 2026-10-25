import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Share2, Mail, Facebook, Twitter, Instagram, Linkedin, Copy, Download, 
  QrCode, TrendingUp, Eye, Click, Users, MessageSquare, Send, Settings,
  BarChart3, Target, Megaphone, Globe, Smartphone, Monitor
} from "lucide-react";

interface MarketingCampaign {
  id: string;
  name: string;
  type: 'email' | 'social' | 'seo' | 'ppc';
  status: 'active' | 'paused' | 'completed';
  budget: number;
  spent: number;
  clicks: number;
  impressions: number;
  conversions: number;
  createdAt: string;
}

export function MarketingTools() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [socialContent, setSocialContent] = useState({
    title: "",
    description: "",
    hashtags: "#LuxuryRealEstate #DreamHome #PrestigeEdge",
    image: ""
  });

  // Fetch marketing campaigns
  const { data: campaigns = [], isLoading: campaignLoading } = useQuery({
    queryKey: ['/api/marketing/campaigns'],
  });

  // Fetch properties for marketing
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
  });

  // Fetch marketing analytics
  const { data: analytics } = useQuery({
    queryKey: ['/api/marketing/analytics'],
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await apiRequest('POST', '/api/marketing/campaigns', campaignData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      toast({
        title: "Success",
        description: "Marketing campaign created successfully",
      });
    },
  });

  // Generate social media content
  const generateSocialContentMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await apiRequest('POST', `/api/marketing/social-content/${propertyId}`);
      return response.json();
    },
    onSuccess: (data) => {
      setSocialContent(data);
      toast({
        title: "Content Generated",
        description: "Social media content has been generated",
      });
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
  };

  const shareToSocial = (platform: string, content: any) => {
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(content.title)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content.title + ' ' + content.hashtags)}&url=${encodeURIComponent(window.location.origin)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&title=${encodeURIComponent(content.title)}`,
      instagram: '#' // Instagram requires manual posting
    };

    if (platform === 'instagram') {
      copyToClipboard(`${content.title}\n\n${content.description}\n\n${content.hashtags}`);
      toast({
        title: "Content Ready",
        description: "Instagram content copied to clipboard. Open Instagram to post.",
      });
    } else {
      window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Marketing Tools</h2>
          <p className="text-luxury-platinum">Promote properties and track campaign performance</p>
        </div>
        <div className="flex space-x-2">
          {analytics && (
            <div className="flex space-x-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-luxury-gold">{analytics.totalViews || 0}</div>
                <div className="text-luxury-platinum">Total Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-luxury-gold">{analytics.totalLeads || 0}</div>
                <div className="text-luxury-platinum">Leads Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-luxury-gold">{analytics.conversionRate || 0}%</div>
                <div className="text-luxury-platinum">Conversion Rate</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-luxury-black-medium">
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
            <Target className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
            <Share2 className="h-4 w-4 mr-2" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
            <Mail className="h-4 w-4 mr-2" />
            Email Marketing
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-luxury-gold data-[state=active]:text-black">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Stats */}
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-luxury-gold" />
                  Active Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-luxury-gold mb-2">
                  {campaigns?.filter((c: MarketingCampaign) => c.status === 'active').length || 0}
                </div>
                <p className="text-luxury-platinum text-sm">Total budget: {formatPrice(campaigns?.reduce((sum: number, c: MarketingCampaign) => sum + c.budget, 0) || 0)}</p>
              </CardContent>
            </Card>

            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-luxury-gold" />
                  Total Impressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-luxury-gold mb-2">
                  {campaigns?.reduce((sum: number, c: MarketingCampaign) => sum + c.impressions, 0)?.toLocaleString() || 0}
                </div>
                <p className="text-luxury-platinum text-sm">Across all campaigns</p>
              </CardContent>
            </Card>

            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="h-5 w-5 mr-2 text-luxury-gold" />
                  Conversions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-luxury-gold mb-2">
                  {campaigns?.reduce((sum: number, c: MarketingCampaign) => sum + c.conversions, 0) || 0}
                </div>
                <p className="text-luxury-platinum text-sm">Leads generated</p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign List */}
          <Card className="bg-luxury-black-light border-luxury-gold/20">
            <CardHeader>
              <CardTitle className="text-white">Campaign Management</CardTitle>
              <CardDescription className="text-luxury-platinum">
                Create and manage your marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns?.length > 0 ? (
                  campaigns.map((campaign: MarketingCampaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border border-luxury-gold/20 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{campaign.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-luxury-platinum">
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                            <span>Budget: {formatPrice(campaign.budget)}</span>
                            <span>Spent: {formatPrice(campaign.spent)}</span>
                            <span>CTR: {campaign.clicks > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : 0}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="border-luxury-gold/30 text-luxury-gold">
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="border-luxury-gold/30 text-luxury-gold">
                          {campaign.status === 'active' ? 'Pause' : 'Resume'}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Megaphone className="h-12 w-12 mx-auto text-luxury-gold/50 mb-4" />
                    <p className="text-luxury-platinum">No marketing campaigns yet</p>
                    <Button className="mt-4 bg-gold-gradient text-black">
                      Create First Campaign
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Generator */}
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-white">Social Media Content Generator</CardTitle>
                <CardDescription className="text-luxury-platinum">
                  Generate engaging content for your property listings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-luxury-gold">Select Property</Label>
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="w-full p-2 bg-luxury-black-medium border border-luxury-gold/30 rounded text-white"
                  >
                    <option value="">Choose a property...</option>
                    {properties.map((property: any) => (
                      <option key={property.id} value={property.id}>
                        {property.title} - {formatPrice(property.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={() => selectedProperty && generateSocialContentMutation.mutate(selectedProperty)}
                  disabled={!selectedProperty || generateSocialContentMutation.isPending}
                  className="w-full bg-gold-gradient text-black"
                >
                  {generateSocialContentMutation.isPending ? "Generating..." : "Generate Content"}
                </Button>

                {socialContent.title && (
                  <div className="space-y-4 p-4 border border-luxury-gold/20 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Title</Label>
                      <Input
                        value={socialContent.title}
                        onChange={(e) => setSocialContent(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Description</Label>
                      <Textarea
                        value={socialContent.description}
                        onChange={(e) => setSocialContent(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-luxury-gold">Hashtags</Label>
                      <Input
                        value={socialContent.hashtags}
                        onChange={(e) => setSocialContent(prev => ({ ...prev, hashtags: e.target.value }))}
                        className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`${socialContent.title}\n\n${socialContent.description}\n\n${socialContent.hashtags}`)}
                        className="border-luxury-gold/30 text-luxury-gold"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy All
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Media Posting */}
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-white">Share to Social Media</CardTitle>
                <CardDescription className="text-luxury-platinum">
                  Post your content across social platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => shareToSocial('facebook', socialContent)}
                    disabled={!socialContent.title}
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Facebook className="h-4 w-4" />
                    <span>Facebook</span>
                  </Button>

                  <Button
                    onClick={() => shareToSocial('twitter', socialContent)}
                    disabled={!socialContent.title}
                    className="flex items-center justify-center space-x-2 bg-sky-500 hover:bg-sky-600"
                  >
                    <Twitter className="h-4 w-4" />
                    <span>Twitter</span>
                  </Button>

                  <Button
                    onClick={() => shareToSocial('linkedin', socialContent)}
                    disabled={!socialContent.title}
                    className="flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800"
                  >
                    <Linkedin className="h-4 w-4" />
                    <span>LinkedIn</span>
                  </Button>

                  <Button
                    onClick={() => shareToSocial('instagram', socialContent)}
                    disabled={!socialContent.title}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>Instagram</span>
                  </Button>
                </div>

                <Separator className="bg-luxury-gold/20" />

                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Social Media Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-luxury-platinum">Facebook Engagement</span>
                      <Badge variant="outline" className="text-luxury-gold border-luxury-gold/30">+12%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-luxury-platinum">Instagram Reach</span>
                      <Badge variant="outline" className="text-luxury-gold border-luxury-gold/30">+8%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-luxury-platinum">LinkedIn Views</span>
                      <Badge variant="outline" className="text-luxury-gold border-luxury-gold/30">+15%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Marketing Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card className="bg-luxury-black-light border-luxury-gold/20">
            <CardHeader>
              <CardTitle className="text-white">Email Campaign Builder</CardTitle>
              <CardDescription className="text-luxury-platinum">
                Create targeted email campaigns for your property listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-luxury-gold/50 mb-4" />
                <p className="text-luxury-platinum mb-4">Email marketing campaigns coming soon</p>
                <p className="text-sm text-luxury-platinum/70">
                  This feature will allow you to create and send targeted email campaigns to potential buyers
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-luxury-platinum">Total Clicks</p>
                    <p className="text-2xl font-bold text-white">2,350</p>
                  </div>
                  <Click className="h-6 w-6 text-luxury-gold" />
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-green-500 border-green-500/30">+12%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-luxury-platinum">Impressions</p>
                    <p className="text-2xl font-bold text-white">45,231</p>
                  </div>
                  <Eye className="h-6 w-6 text-luxury-gold" />
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-green-500 border-green-500/30">+8%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-luxury-platinum">CTR</p>
                    <p className="text-2xl font-bold text-white">5.2%</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-luxury-gold" />
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-green-500 border-green-500/30">+0.8%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-luxury-platinum">Conversions</p>
                    <p className="text-2xl font-bold text-white">48</p>
                  </div>
                  <Users className="h-6 w-6 text-luxury-gold" />
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-green-500 border-green-500/30">+15%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-luxury-black-light border-luxury-gold/20">
            <CardHeader>
              <CardTitle className="text-white">Marketing Performance</CardTitle>
              <CardDescription className="text-luxury-platinum">
                Track your marketing campaign effectiveness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-luxury-gold/50 mb-4" />
                <p className="text-luxury-platinum mb-4">Detailed analytics dashboard coming soon</p>
                <p className="text-sm text-luxury-platinum/70">
                  View comprehensive marketing performance metrics and insights
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}