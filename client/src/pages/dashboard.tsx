"use client";

import { useState, useEffect } from "react";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  User,
  Home,
  Heart,
  MessageSquare,
  Settings,
  Plus,
  TrendingUp,
  Building,
  LogOut,
  Mail,
  CreditCard,
  CalendarDays,
  Calendar,
} from "lucide-react";
import { PropertyGrid } from "@/components/dashboard/property-grid";
import { PropertyForm } from "@/components/dashboard/property-form";
import { ClientInquiries } from "@/components/dashboard/client-inquiries";
import { Messages } from "@/components/dashboard/messages";
import { Viewings } from "@/components/dashboard/viewings";
import { EmailSettings } from "@/components/dashboard/email-settings";
import { DashboardMobileMenu } from "@/components/ui/dashboard-mobile-menu";
import { Link } from "wouter";
import { PropertyRecommendations } from "@/components/ai/property-recommendations";
import { MarketAnalysis } from "@/components/ai/market-analysis";
import { AIChatbot } from "@/components/ai/ai-chatbot";
import { AdminAITools } from "@/components/admin/ai-tools";
import { Consultations } from "@/components/dashboard/consultations";
import type { Property } from "@shared/schema";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const logoutMutation = useLogout();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | undefined>();
  const [chatbotOpen, setChatbotOpen] = useState(false);





  // Helper functions for mobile navigation
  const getTabIcon = (tab: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      overview: <TrendingUp className="h-4 w-4" strokeWidth={1.5} />,
      saved: <Heart className="h-4 w-4" strokeWidth={1.5} />,
      properties: <Building className="h-4 w-4" strokeWidth={1.5} />,
      inquiries: <MessageSquare className="h-4 w-4" strokeWidth={1.5} />,
      messages: <MessageSquare className="h-4 w-4" strokeWidth={1.5} />,
      viewings: <Home className="h-4 w-4" strokeWidth={1.5} />,
      consultations: <Calendar className="h-4 w-4" strokeWidth={1.5} />,
      'email-settings': <Mail className="h-4 w-4" strokeWidth={1.5} />,
      'ai-recommendations': <Sparkles className="h-4 w-4" strokeWidth={1.5} />,
      'ai-tools': <Sparkles className="h-4 w-4" strokeWidth={1.5} />,
      subscription: <CreditCard className="h-4 w-4" strokeWidth={1.5} />,
      profile: <User className="h-4 w-4" strokeWidth={1.5} />,
    };
    return iconMap[tab] || <TrendingUp className="h-4 w-4" strokeWidth={1.5} />;
  };

  const getTabLabel = (tab: string) => {
    const labelMap: Record<string, string> = {
      overview: 'Overview',
      saved: 'Saved Properties',
      properties: 'My Properties',
      inquiries: 'Inquiries',
      messages: 'Messages',
      viewings: 'Viewings',
      consultations: 'Consultations',
      'email-settings': 'Email Settings',
      'ai-recommendations': 'AI Recommendations',
      'ai-tools': 'AI Tools',
      subscription: 'Subscription',
      profile: 'Profile',
    };
    return labelMap[tab] || 'Dashboard';
  };

  const getTabOptions = () => {
    const tabs = [
      { value: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> },
    ];

    if (user?.role === 'client') {
      tabs.push(
        { value: 'saved', label: 'Saved Properties', icon: <Heart className="h-4 w-4" strokeWidth={1.5} /> },
        { value: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" strokeWidth={1.5} /> },
        { value: 'viewings', label: 'Viewings', icon: <Home className="h-4 w-4" strokeWidth={1.5} /> },
        { value: 'ai-recommendations', label: 'AI Recommendations', icon: <Sparkles className="h-4 w-4" strokeWidth={1.5} /> },
      );
    }

    if (user?.role === 'agent' || user?.role === 'admin') {
      tabs.push(
        { value: 'properties', label: 'My Properties', icon: <Building className="h-4 w-4" strokeWidth={1.5} /> },
        { value: 'consultations', label: 'Consultations', icon: <Calendar className="h-4 w-4" strokeWidth={1.5} /> },
        { value: 'ai-tools', label: 'AI Tools', icon: <Sparkles className="h-4 w-4" strokeWidth={1.5} /> },
      );
    }

    tabs.push({ value: 'inquiries', label: 'Inquiries', icon: <MessageSquare className="h-4 w-4" strokeWidth={1.5} /> });

    if (user?.role === 'admin') {
      tabs.push({ value: 'email-settings', label: 'Email Settings', icon: <Mail className="h-4 w-4" strokeWidth={1.5} /> });
    }

    tabs.push({ value: 'profile', label: 'Profile', icon: <User className="h-4 w-4" strokeWidth={1.5} /> });

    return tabs;
  };
  
  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to access the dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
      return;
    }
  }, [user, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-luxe-bg flex items-center justify-center">
        <div className="text-center relative z-10">
          <div className="font-serif text-2xl md:text-3xl tracking-wide text-luxe-text mb-6">
            PRESTIGE<span className="text-luxe-bronze">EDGE</span>
          </div>
          <p className="text-luxe-text-muted text-xs uppercase tracking-widest mb-6">Loading dashboard</p>
          <div className="w-8 h-8 border-2 border-luxe-bronze border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setShowPropertyForm(true);
  };

  const handlePropertyFormSuccess = () => {
    setShowPropertyForm(false);
    setEditingProperty(undefined);
    toast({
      title: "Success",
      description: "Property saved successfully",
    });
  };

  const handlePropertyFormCancel = () => {
    setShowPropertyForm(false);
    setEditingProperty(undefined);
  };

  if (showPropertyForm) {
    return (
      <div className="min-h-screen bg-luxe-bg relative">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PropertyForm
            property={editingProperty}
            onSuccess={handlePropertyFormSuccess}
            onCancel={handlePropertyFormCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxe-bg relative">
      {/* LUXE Minimal Header */}
      <header className="sticky top-0 w-full bg-luxe-bg/95 backdrop-blur-sm z-50 border-b border-luxe-border/30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 md:h-14">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <span className="font-serif text-lg md:text-xl tracking-wide text-luxe-text">
                  PRESTIGE<span className="text-luxe-bronze">EDGE</span>
                </span>
              </Link>
              <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest text-luxe-bronze border border-luxe-bronze/40 px-2 py-0.5">
                {user.role === 'admin' ? 'Admin' : user.role === 'agent' ? 'Agent' : 'Client'}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze hover:bg-transparent h-8 px-3">
                  <Home className="h-3.5 w-3.5 mr-1.5" />
                  Home
                </Button>
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze hover:bg-transparent h-8 px-3">
                    Admin
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze hover:bg-transparent h-8 px-3"
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                {logoutMutation.isPending ? "Signing out" : "Sign Out"}
              </Button>
            </div>

            {/* Dashboard Mobile Menu */}
            <DashboardMobileMenu
              activeTab={activeTab}
              onTabChange={setActiveTab}
              userRole={user.role}
              onLogout={() => logoutMutation.mutate()}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Welcome Section */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between space-y-4 sm:space-y-0 border-b border-luxe-border/30 pb-6 md:pb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-luxe-bronze mb-3">Dashboard</p>
              <h1 className="font-serif text-3xl md:text-5xl font-normal text-luxe-text leading-tight">
                Welcome, <span className="text-luxe-bronze italic">{user.name}</span>
              </h1>
              <p className="text-luxe-text-muted text-sm md:text-base mt-3 max-w-xl">
                {user.role === 'admin'
                  ? 'Manage your luxury real estate platform'
                  : user.role === 'agent'
                  ? 'Manage your property portfolio and clients'
                  : 'Discover and curate your dream luxury properties'
                }
              </p>
            </div>

            {(user.role === 'agent' || user.role === 'admin') && (
              <Button
                onClick={() => setShowPropertyForm(true)}
                className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light h-9 px-5 text-xs uppercase tracking-widest rounded-none font-medium"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add Property
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="w-full mb-8 md:mb-10">
          {/* Mobile Tab Navigation */}
          <div className="md:hidden mb-4">
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4">
              {getTabOptions().map((tab) => (
                <button
                  key={tab.value}
                  className={`whitespace-nowrap flex-shrink-0 px-4 py-2 text-xs uppercase tracking-widest border transition-colors ${
                    activeTab === tab.value
                      ? "bg-luxe-bronze text-luxe-bg border-luxe-bronze"
                      : "bg-transparent border-luxe-border/50 text-luxe-text-muted hover:text-luxe-bronze hover:border-luxe-bronze/40"
                  }`}
                  onClick={() => setActiveTab(tab.value)}
                >
                  <span className="inline-flex items-center">
                    {tab.icon}
                    <span className="ml-1.5">{tab.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <div className="hidden md:block">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="bg-transparent border-b border-luxe-border/30 p-0 flex-wrap h-auto gap-0 w-full justify-start rounded-none">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-2" />
                  Overview
                </TabsTrigger>

                {user?.role === 'client' && (
                  <TabsTrigger
                    value="saved"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                  >
                    <Heart className="h-3.5 w-3.5 mr-2" />
                    Saved
                  </TabsTrigger>
                )}

                {(user?.role === 'agent' || user?.role === 'admin') && (
                  <TabsTrigger
                    value="properties"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                  >
                    <Building className="h-3.5 w-3.5 mr-2" />
                    Properties
                  </TabsTrigger>
                )}

                <TabsTrigger
                  value="inquiries"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />
                  Inquiries
                </TabsTrigger>

                {user?.role === 'client' && (
                  <>
                    <TabsTrigger
                      value="messages"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-2" />
                      Messages
                    </TabsTrigger>

                    <TabsTrigger
                      value="viewings"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                    >
                      <Home className="h-3.5 w-3.5 mr-2" />
                      Viewings
                    </TabsTrigger>

                    <TabsTrigger
                      value="ai-recommendations"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                      AI Recs
                    </TabsTrigger>
                  </>
                )}

                {user?.role === 'admin' && (
                  <TabsTrigger
                    value="email-settings"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                  >
                    <Mail className="h-3.5 w-3.5 mr-2" />
                    Email
                  </TabsTrigger>
                )}

                {(user?.role === 'agent' || user?.role === 'admin') && (
                  <>
                    <TabsTrigger
                      value="consultations"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                    >
                      <CalendarDays className="h-3.5 w-3.5 mr-2" />
                      Consultations
                    </TabsTrigger>

                    <TabsTrigger
                      value="ai-tools"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                      AI Tools
                    </TabsTrigger>
                  </>
                )}

                <TabsTrigger
                  value="profile"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <User className="h-3.5 w-3.5 mr-2" />
                  Profile
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="w-full">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-8 md:space-y-10">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-luxe-border/30 border border-luxe-border/30">
                <div className="bg-luxe-bg p-6 md:p-8">
                  <Building className="h-5 w-5 text-luxe-bronze mb-4" strokeWidth={1.5} />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-2">Total Properties</p>
                  <p className="font-serif text-3xl md:text-4xl text-luxe-text">{(stats as any)?.totalProperties || 0}</p>
                </div>

                <div className="bg-luxe-bg p-6 md:p-8">
                  <TrendingUp className="h-5 w-5 text-luxe-bronze mb-4" strokeWidth={1.5} />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-2">Active Listings</p>
                  <p className="font-serif text-3xl md:text-4xl text-luxe-text">{(stats as any)?.activeListings || 0}</p>
                </div>

                <div className="bg-luxe-bg p-6 md:p-8">
                  <Heart className="h-5 w-5 text-luxe-bronze mb-4" strokeWidth={1.5} />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-2">Saved Properties</p>
                  <p className="font-serif text-3xl md:text-4xl text-luxe-text">{(stats as any)?.savedProperties || 0}</p>
                </div>

                <div className="bg-luxe-bg p-6 md:p-8">
                  <MessageSquare className="h-5 w-5 text-luxe-bronze mb-4" strokeWidth={1.5} />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-2">Inquiries</p>
                  <p className="font-serif text-3xl md:text-4xl text-luxe-text">{(stats as any)?.totalInquiries || 0}</p>
                </div>
              </div>

            {user.role === 'client' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PropertyRecommendations className="h-fit" />
                <MarketAnalysis className="h-fit" />
              </div>
            )}
            
            {(user.role === 'agent' || user.role === 'admin') && (
              <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
                <CardHeader>
                  <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                    <Building className="h-5 w-5 text-luxe-bronze mr-2" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-luxe-text-muted">No recent activity</p>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          )}

          {/* Saved Properties Tab (Client only) */}
          {activeTab === "saved" && user.role === 'client' && (
            <div>
              <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
                <CardHeader>
                  <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                    <Heart className="h-5 w-5 text-luxe-bronze mr-2" />
                    Saved Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyGrid savedOnly />
                </CardContent>
              </Card>
            </div>
          )}

          {/* My Properties Tab (Agent/Admin) */}
          {activeTab === "properties" && (user.role === 'agent' || user.role === 'admin') && (
            <div>
              <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
                <CardHeader>
                  <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                    <Building className="h-5 w-5 text-luxe-bronze mr-2" />
                    My Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyGrid showActions onEdit={handleEditProperty} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Inquiries Tab */}
          {activeTab === "inquiries" && (
            <div>
              <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
                <CardHeader>
                  <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                    <MessageSquare className="h-5 w-5 text-luxe-bronze mr-2" />
                    {user.role === 'client' ? 'My Inquiries' : 'Inquiries'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.role === 'client' ? (
                    <ClientInquiries />
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-luxe-bronze mx-auto mb-4 opacity-50" />
                      <p className="text-luxe-text font-serif text-lg">No inquiries yet</p>
                      <p className="text-luxe-text-muted text-sm mt-1">
                        Property inquiries will appear here when clients contact you
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Messages Tab (Client only) */}
          {activeTab === "messages" && user.role === 'client' && (
            <div>
              <Messages />
            </div>
          )}

          {/* Viewings Tab (Client only) */}
          {activeTab === "viewings" && user.role === 'client' && (
            <div>
              <Viewings />
            </div>
          )}

          {/* AI Recommendations Tab (Client only) */}
          {activeTab === "ai-recommendations" && user.role === 'client' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PropertyRecommendations className="lg:col-span-2" />
                <MarketAnalysis />
                <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
                  <CardHeader>
                    <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                      <Sparkles className="h-5 w-5 text-luxe-bronze mr-2" strokeWidth={1.5} />
                      AI-Powered Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-luxe-text-muted text-sm space-y-2">
                      <p>✨ <span className="text-luxe-text font-medium">Intelligent Property Matching:</span> AI analyzes your preferences to find perfect luxury properties</p>
                      <p>📊 <span className="text-luxe-text font-medium">Market Insights:</span> Real-time analysis of luxury real estate trends and pricing</p>
                      <p>🎯 <span className="text-luxe-text font-medium">Personalized Recommendations:</span> Curated selections based on your lifestyle and budget</p>
                      <p>💬 <span className="text-luxe-text font-medium">ARIA Concierge:</span> 24/7 AI assistant for all your luxury property questions</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Email Settings Tab (Admin only) */}
          {activeTab === "email-settings" && user.role === 'admin' && (
            <div>
              <EmailSettings />
            </div>
          )}

          {/* Consultations Tab (Agent/Admin only) */}
          {activeTab === "consultations" && (user.role === 'agent' || user.role === 'admin') && (
            <div>
              <Consultations />
            </div>
          )}

          {/* AI Tools Tab (Agent/Admin only) */}
          {activeTab === "ai-tools" && (user.role === 'agent' || user.role === 'admin') && (
            <div className="space-y-6">
              <AdminAITools />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div>
            <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                  <User className="h-5 w-5 text-luxe-bronze mr-2" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-luxe-bronze uppercase tracking-wider block mb-2">
                      Full Name
                    </label>
                    <p className="text-luxe-text text-base bg-luxe-surface-light border border-luxe-border/30 p-3">
                      {user.name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-luxe-bronze uppercase tracking-wider block mb-2">
                      Email Address
                    </label>
                    <p className="text-luxe-text text-base bg-luxe-surface-light border border-luxe-border/30 p-3">
                      {user.email}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-luxe-bronze uppercase tracking-wider block mb-2">
                      Phone Number
                    </label>
                    <p className="text-luxe-text text-base bg-luxe-surface-light border border-luxe-border/30 p-3">
                      {user.phone || "Not provided"}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-luxe-bronze uppercase tracking-wider block mb-2">
                      Account Type
                    </label>
                    <span className="inline-block text-[10px] uppercase tracking-widest text-luxe-bronze border border-luxe-bronze/40 px-3 py-1.5">
                      {user.role === 'admin' ? 'Administrator' : user.role === 'agent' ? 'Real Estate Agent' : 'Property Buyer'}
                    </span>
                  </div>
                </div>
                
                {user.bio && (
                  <div>
                    <label className="text-sm font-semibold text-luxe-bronze uppercase tracking-wider block mb-2">
                      Bio
                    </label>
                    <p className="text-luxe-text bg-luxe-surface-light border border-luxe-border/30 p-3">
                      {user.bio}
                    </p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-luxe-border/30">
                  <Button className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light h-9 px-5 text-xs uppercase tracking-widest rounded-none font-medium">
                    <Settings className="h-3.5 w-3.5 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </main>

      {/* AI Chatbot */}
      <AIChatbot 
        isOpen={chatbotOpen} 
        onToggle={() => setChatbotOpen(!chatbotOpen)} 
      />
    </div>
  );
}
