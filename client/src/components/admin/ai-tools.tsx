import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
// Removed Tabs import - using custom tab system
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Crown, 
  Wand2, 
  TrendingUp, 
  Users, 
  Share2, 
  RefreshCw, 
  Copy, 
  CheckCircle,
  Sparkles,
  Target,
  Mail,
  MessageSquare,
  Calculator,
  Camera,
  Home
} from "lucide-react";

export function AdminAITools() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("marketing-content");
  
  // Lead Qualification State
  const [leadData, setLeadData] = useState({
    name: "",
    email: "",
    phone: "",
    budget: "",
    location: "",
    propertyType: "",
    timeline: ""
  });
  const [leadQualification, setLeadQualification] = useState<any>(null);
  const [isQualifyingLead, setIsQualifyingLead] = useState(false);

  // Marketing Content State
  const [selectedProperty, setSelectedProperty] = useState("");
  const [contentType, setContentType] = useState("social");
  const [marketingContent, setMarketingContent] = useState<any>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // AI Valuation State
  const [valuationAddress, setValuationAddress] = useState("");
  const [valuationData, setValuationData] = useState<any>(null);
  const [isGeneratingValuation, setIsGeneratingValuation] = useState(false);

  // Virtual Staging State
  const [stagingPropertyId, setStagingPropertyId] = useState("");
  const [stagingStyle, setStagingStyle] = useState("modern");
  const [stagingImages, setStagingImages] = useState<any>(null);
  const [isGeneratingStaging, setIsGeneratingStaging] = useState(false);

  // Fetch properties for marketing
  const { data: propertiesData } = useQuery({
    queryKey: ['/api/properties'],
  });
  const properties = (propertiesData as any)?.properties || [];
  


  const qualifyLead = async () => {
    if (!leadData.name || !leadData.email || !leadData.budget) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least name, email, and budget",
        variant: "destructive",
      });
      return;
    }

    setIsQualifyingLead(true);
    try {
      const response = await fetch('/api/ai/qualify-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(leadData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLeadQualification(data.qualification);
      
      toast({
        title: "Lead Qualified!",
        description: "AI analysis complete with recommendations",
      });
    } catch (error) {
      console.error('Lead qualification error:', error);
      toast({
        title: "Qualification Error",
        description: "Failed to qualify lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsQualifyingLead(false);
    }
  };

  const generateMarketingContent = async () => {
    if (!selectedProperty || !contentType) {
      toast({
        title: "Missing Selection",
        description: "Please select a property and content type",
        variant: "destructive",
      });
      return;
    }

    const property = properties.find((p: any) => p.id === selectedProperty);
    if (!property) return;

    setIsGeneratingContent(true);
    try {
      const response = await fetch('/api/ai/marketing-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ property, contentType })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMarketingContent(data.content);
      
      toast({
        title: "Content Generated!",
        description: `${contentType} content created successfully`,
      });
    } catch (error) {
      console.error('Marketing content error:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const generateValuation = async () => {
    if (!valuationAddress.trim()) {
      toast({
        title: "Missing Address",
        description: "Please enter a property address",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingValuation(true);
    try {
      const response = await fetch('/api/ai/valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ address: valuationAddress })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setValuationData(data.valuation);
      
      toast({
        title: "AI Valuation Complete!",
        description: "Property analysis ready with pricing insights",
      });
    } catch (error) {
      console.error('Valuation error:', error);
      toast({
        title: "Valuation Failed",
        description: "Unable to generate property valuation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingValuation(false);
    }
  };

  const generateVirtualStaging = async () => {
    if (!stagingPropertyId) {
      toast({
        title: "No Property Selected",
        description: "Please select a property for virtual staging",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingStaging(true);
    try {
      const response = await fetch('/api/ai/virtual-staging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          propertyId: stagingPropertyId,
          style: stagingStyle 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStagingImages(data.staging);
      
      toast({
        title: "Virtual Staging Complete!",
        description: "AI-staged images generated successfully",
      });
    } catch (error) {
      console.error('Virtual staging error:', error);
      toast({
        title: "Staging Failed",
        description: "Unable to generate virtual staging. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingStaging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Crown className="h-8 w-8 text-luxury-gold" />
          <h2 className="text-2xl font-bold text-white">AI Business Tools</h2>
        </div>
        <p className="text-luxury-platinum">Advanced AI-powered tools for luxury real estate professionals</p>
      </div>

      <div className="flex flex-col items-center space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
          <button 
            onClick={() => setActiveTab("lead-qualification")}
            className={`h-12 px-6 rounded-lg flex items-center justify-center transition-all font-medium ${
              activeTab === "lead-qualification" 
                ? "bg-luxury-gold text-black shadow-lg" 
                : "bg-luxury-black-medium text-luxury-platinum hover:bg-luxury-black-light border border-luxury-gold/20"
            }`}
          >
            <Target className="h-5 w-5 mr-3" />
            Lead Qualification
          </button>
          <button 
            onClick={() => setActiveTab("marketing-content")}
            className={`h-12 px-6 rounded-lg flex items-center justify-center transition-all font-medium ${
              activeTab === "marketing-content" 
                ? "bg-luxury-gold text-black shadow-lg" 
                : "bg-luxury-black-medium text-luxury-platinum hover:bg-luxury-black-light border border-luxury-gold/20"
            }`}
          >
            <Share2 className="h-5 w-5 mr-3" />
            Marketing Content
          </button>
          <button 
            onClick={() => setActiveTab("valuation-ai")}
            className={`h-12 px-6 rounded-lg flex items-center justify-center transition-all font-medium ${
              activeTab === "valuation-ai" 
                ? "bg-luxury-gold text-black shadow-lg" 
                : "bg-luxury-black-medium text-luxury-platinum hover:bg-luxury-black-light border border-luxury-gold/20"
            }`}
          >
            <TrendingUp className="h-5 w-5 mr-3" />
            AI Valuation
          </button>
          <button 
            onClick={() => setActiveTab("virtual-staging")}
            className={`h-12 px-6 rounded-lg flex items-center justify-center transition-all font-medium ${
              activeTab === "virtual-staging" 
                ? "bg-luxury-gold text-black shadow-lg" 
                : "bg-luxury-black-medium text-luxury-platinum hover:bg-luxury-black-light border border-luxury-gold/20"
            }`}
          >
            <Sparkles className="h-5 w-5 mr-3" />
            Virtual Staging
          </button>
        </div>

        {/* Lead Qualification Content */}
        {activeTab === "lead-qualification" && (
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="h-5 w-5 text-luxury-gold mr-2" />
                  Lead Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Full Name"
                    value={leadData.name}
                    onChange={(e) => setLeadData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                  />
                  <Input
                    placeholder="Email Address"
                    type="email"
                    value={leadData.email}
                    onChange={(e) => setLeadData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                  />
                  <Input
                    placeholder="Phone Number"
                    value={leadData.phone}
                    onChange={(e) => setLeadData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                  />
                  <Input
                    placeholder="Budget (e.g., $2M - $5M)"
                    value={leadData.budget}
                    onChange={(e) => setLeadData(prev => ({ ...prev, budget: e.target.value }))}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                  />
                  <Input
                    placeholder="Preferred Location"
                    value={leadData.location}
                    onChange={(e) => setLeadData(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                  />
                  <Select value={leadData.propertyType} onValueChange={(value) => setLeadData(prev => ({ ...prev, propertyType: value }))}>
                    <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                      <SelectValue placeholder="Property Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-luxury-black-medium border-luxury-gold/30">
                      <SelectItem value="mansion">Mansion</SelectItem>
                      <SelectItem value="penthouse">Penthouse</SelectItem>
                      <SelectItem value="estate">Estate</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="condo">Luxury Condo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Timeline (e.g., 3-6 months)"
                  value={leadData.timeline}
                  onChange={(e) => setLeadData(prev => ({ ...prev, timeline: e.target.value }))}
                  className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                />
                
                <Button
                  onClick={qualifyLead}
                  disabled={isQualifyingLead}
                  className="w-full bg-luxury-gold text-black hover:bg-luxury-gold/90"
                >
                  {isQualifyingLead ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Lead...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Qualify Lead with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {leadQualification && (
              <Card className="bg-luxury-black-light border-luxury-gold/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Sparkles className="h-5 w-5 text-luxury-gold mr-2" />
                    AI Qualification Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-luxury-platinum">Qualification Score:</span>
                    <Badge 
                      className={`px-3 py-1 ${
                        leadQualification.qualificationScore >= 80 
                          ? 'bg-green-500/20 text-green-400 border-green-500/50'
                          : leadQualification.qualificationScore >= 60
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                          : 'bg-red-500/20 text-red-400 border-red-500/50'
                      }`}
                    >
                      {leadQualification.qualificationScore}/100
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-luxury-platinum">Priority Level:</span>
                    <Badge className="bg-luxury-gold/20 text-luxury-gold border-luxury-gold/50 capitalize">
                      {leadQualification.priority}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <span className="text-luxury-platinum">Buyer Profile:</span>
                    <p className="text-white capitalize">{leadQualification.buyerProfile}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-luxury-platinum">Recommended Actions:</span>
                    <ul className="text-white text-sm space-y-1">
                      {leadQualification.recommendations?.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-luxury-gold mt-1">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="text-luxury-platinum">Next Steps:</span>
                    <ul className="text-white text-sm space-y-1">
                      {leadQualification.nextSteps?.map((step: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-luxury-gold mt-1">→</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </div>
        )}

        {/* Marketing Content */}
        {activeTab === "marketing-content" && (
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Share2 className="h-5 w-5 text-luxury-gold mr-2" />
                  Content Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-luxury-gold text-sm font-medium">Select Property</label>
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                      <SelectValue placeholder="Choose a property..." />
                    </SelectTrigger>
                    <SelectContent className="bg-luxury-black-medium border-luxury-gold/30">
                      {properties.map((property: any) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title} - ${property.price?.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-luxury-gold text-sm font-medium">Content Type</label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-luxury-black-medium border-luxury-gold/30">
                      <SelectItem value="social">Social Media Post</SelectItem>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="brochure">Property Brochure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateMarketingContent}
                  disabled={isGeneratingContent || !selectedProperty}
                  className="w-full bg-luxury-gold text-black hover:bg-luxury-gold/90"
                >
                  {isGeneratingContent ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate AI Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {marketingContent && (
              <Card className="bg-luxury-black-light border-luxury-gold/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-luxury-gold mr-2" />
                      Generated Content
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(
                        contentType === 'email' 
                          ? `Subject: ${marketingContent.subject}\n\n${marketingContent.body}`
                          : contentType === 'social'
                          ? `${marketingContent.body}\n\n${marketingContent.hashtags?.join(' ') || ''}`
                          : `${marketingContent.headline}\n\n${marketingContent.body}`
                      )}
                      className="border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy All
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contentType === 'email' && marketingContent.subject && (
                    <div className="space-y-2">
                      <label className="text-luxury-gold text-sm font-medium">Email Subject</label>
                      <div className="p-3 bg-luxury-black-medium rounded-lg border border-luxury-gold/20">
                        <p className="text-white">{marketingContent.subject}</p>
                      </div>
                    </div>
                  )}

                  {contentType === 'brochure' && marketingContent.headline && (
                    <div className="space-y-2">
                      <label className="text-luxury-gold text-sm font-medium">Headline</label>
                      <div className="p-3 bg-luxury-black-medium rounded-lg border border-luxury-gold/20">
                        <p className="text-white font-semibold">{marketingContent.headline}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-luxury-gold text-sm font-medium">
                      {contentType === 'social' ? 'Post Content' : 'Body Content'}
                    </label>
                    <div className="p-4 bg-luxury-black-medium rounded-lg border border-luxury-gold/20">
                      <p className="text-white whitespace-pre-wrap">{marketingContent.body}</p>
                    </div>
                  </div>

                  {contentType === 'social' && marketingContent.hashtags && (
                    <div className="space-y-2">
                      <label className="text-luxury-gold text-sm font-medium">Hashtags</label>
                      <div className="p-3 bg-luxury-black-medium rounded-lg border border-luxury-gold/20">
                        <p className="text-luxury-gold">{marketingContent.hashtags.join(' ')}</p>
                      </div>
                    </div>
                  )}

                  {marketingContent.callToAction && (
                    <div className="space-y-2">
                      <label className="text-luxury-gold text-sm font-medium">Call to Action</label>
                      <div className="p-3 bg-luxury-black-medium rounded-lg border border-luxury-gold/20">
                        <p className="text-white font-medium">{marketingContent.callToAction}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            </div>
          </div>
        )}

        {/* AI Valuation Content */}
        {activeTab === "valuation-ai" && (
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-luxury-black-light border-luxury-gold/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Calculator className="h-5 w-5 text-luxury-gold mr-2" />
                    Property Valuation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-luxury-platinum mb-2 block">
                      Property Address
                    </label>
                    <Input
                      placeholder="Enter full property address..."
                      value={valuationAddress}
                      onChange={(e) => setValuationAddress(e.target.value)}
                      className="bg-luxury-black-medium border-luxury-gold/30 text-white"
                    />
                  </div>
                  <Button 
                    onClick={generateValuation}
                    disabled={isGeneratingValuation}
                    className="w-full bg-luxury-gold text-black hover:bg-luxury-gold/90"
                  >
                    {isGeneratingValuation ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing Property...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Generate AI Valuation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {valuationData && (
                <Card className="bg-luxury-black-light border-luxury-gold/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Home className="h-5 w-5 text-luxury-gold mr-2" />
                      Valuation Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-luxury-black-medium rounded-lg">
                        <div className="text-2xl font-bold text-luxury-gold">
                          ${valuationData.estimatedValue?.toLocaleString() || 'N/A'}
                        </div>
                        <div className="text-sm text-luxury-platinum">Estimated Value</div>
                      </div>
                      <div className="text-center p-3 bg-luxury-black-medium rounded-lg">
                        <div className="text-2xl font-bold text-luxury-gold">
                          {valuationData.confidence || 'N/A'}%
                        </div>
                        <div className="text-sm text-luxury-platinum">Confidence</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-white">Key Insights:</h4>
                      <div className="text-sm text-luxury-platinum space-y-1">
                        {valuationData.insights?.map((insight: string, index: number) => (
                          <div key={index} className="flex items-start">
                            <CheckCircle className="h-3 w-3 text-luxury-gold mr-2 mt-1 flex-shrink-0" />
                            {insight}
                          </div>
                        )) || <div>Detailed insights will appear here</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Virtual Staging Content */}
        {activeTab === "virtual-staging" && (
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-luxury-black-light border-luxury-gold/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Camera className="h-5 w-5 text-luxury-gold mr-2" />
                    Virtual Staging
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-luxury-platinum mb-2 block">
                      Select Property
                    </label>
                    <Select value={stagingPropertyId} onValueChange={setStagingPropertyId}>
                      <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                        <SelectValue placeholder="Choose a property to stage..." />
                      </SelectTrigger>
                      <SelectContent className="bg-luxury-black-light border-luxury-gold/30">
                        {properties.map((property: any) => (
                          <SelectItem key={property.id} value={property.id} className="text-white hover:bg-luxury-black-medium">
                            {property.title} - {property.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-luxury-platinum mb-2 block">
                      Staging Style
                    </label>
                    <Select value={stagingStyle} onValueChange={setStagingStyle}>
                      <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-luxury-black-light border-luxury-gold/30">
                        <SelectItem value="modern" className="text-white hover:bg-luxury-black-medium">Modern Luxury</SelectItem>
                        <SelectItem value="classic" className="text-white hover:bg-luxury-black-medium">Classic Elegance</SelectItem>
                        <SelectItem value="contemporary" className="text-white hover:bg-luxury-black-medium">Contemporary</SelectItem>
                        <SelectItem value="minimalist" className="text-white hover:bg-luxury-black-medium">Minimalist</SelectItem>
                        <SelectItem value="traditional" className="text-white hover:bg-luxury-black-medium">Traditional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={generateVirtualStaging}
                    disabled={isGeneratingStaging}
                    className="w-full bg-luxury-gold text-black hover:bg-luxury-gold/90"
                  >
                    {isGeneratingStaging ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Staging...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Virtual Staging
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {stagingImages && (
                <Card className="bg-luxury-black-light border-luxury-gold/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Camera className="h-5 w-5 text-luxury-gold mr-2" />
                      Staged Images
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {stagingImages.images?.map((image: any, index: number) => (
                        <div key={index} className="relative">
                          <div className="aspect-video bg-luxury-black-medium rounded-lg flex items-center justify-center">
                            <div className="text-center text-luxury-platinum">
                              <Camera className="h-8 w-8 mx-auto mb-2 text-luxury-gold" />
                              <div className="text-xs">Staged Room {index + 1}</div>
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="col-span-2 text-center text-luxury-platinum py-8">
                          Virtual staging images will appear here
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-white">Staging Details:</h4>
                      <div className="text-sm text-luxury-platinum space-y-1">
                        <div>Style: {stagingStyle.charAt(0).toUpperCase() + stagingStyle.slice(1)}</div>
                        <div>Rooms: {stagingImages.roomCount || 'Multiple'}</div>
                        <div>Processing: {stagingImages.processingTime || 'Instant'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}