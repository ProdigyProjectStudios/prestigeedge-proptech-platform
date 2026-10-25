"use client";

import { useState, useEffect } from "react";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User,
  Home,
  Building,
  Users,
  MessageSquare,
  Settings,
  Plus,
  TrendingUp,
  Shield,
  LogOut,
  Edit,
  Trash2,
  Palette,
  BarChart3,
  Target,
} from "lucide-react";
import { PropertyGrid } from "@/components/dashboard/property-grid";
import { PropertyForm } from "@/components/dashboard/property-form";
import { BrandCustomization } from "@/components/admin/brand-customization";
import AnalyticsDashboard from "@/components/analytics/analytics-dashboard";
import MarketingAnalytics from "@/components/analytics/marketing-analytics";
import { DashboardMobileMenu } from "@/components/ui/dashboard-mobile-menu";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Property, User as UserType } from "@shared/schema";

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const logoutMutation = useLogout();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | undefined>();

  // Auto-scroll to properties section when properties tab is selected
  useEffect(() => {
    if (activeTab === "properties") {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        const propertiesSection = document.getElementById("properties-section");
        if (propertiesSection) {
          propertiesSection.scrollIntoView({ 
            behavior: "smooth", 
            block: "start",
            inline: "nearest"
          });
        }
      }, 200);
    }
  }, [activeTab]);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
      return;
    }
  }, [user, isLoading, toast]);

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    },
    enabled: user?.role === 'admin',
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PUT", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-luxe-bg flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-2xl md:text-3xl tracking-wide text-luxe-text mb-6">
            PRESTIGE<span className="text-luxe-bronze">EDGE</span>
          </div>
          <p className="text-luxe-text-muted text-xs uppercase tracking-widest mb-6">Loading admin panel</p>
          <div className="w-8 h-8 border-2 border-luxe-bronze border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
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

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserRoleMutation.mutate({ userId, role: newRole });
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
              <span className="hidden sm:inline-flex items-center text-[10px] uppercase tracking-widest text-luxe-bronze border border-luxe-bronze/40 px-2 py-0.5">
                <Shield className="h-2.5 w-2.5 mr-1" />
                Admin
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
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze hover:bg-transparent h-8 px-3">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Dashboard
                </Button>
              </Link>
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

            {/* Admin Dashboard Mobile Menu */}
            <DashboardMobileMenu
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                if (tab === "properties") {
                  setTimeout(() => {
                    const propertiesSection = document.getElementById("properties-section");
                    if (propertiesSection) {
                      propertiesSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                        inline: "nearest"
                      });
                    }
                  }, 300);
                }
              }}
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
              <p className="text-[10px] uppercase tracking-[0.3em] text-luxe-bronze mb-3">Administration</p>
              <h1 className="font-serif text-3xl md:text-5xl font-normal text-luxe-text leading-tight">
                Admin <span className="text-luxe-bronze italic">Panel</span>
              </h1>
              <p className="text-luxe-text-muted text-sm md:text-base mt-3 max-w-xl">
                Manage your luxury real estate platform
              </p>
            </div>

            <Button
              onClick={() => setShowPropertyForm(true)}
              className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light h-9 px-5 text-xs uppercase tracking-widest rounded-none font-medium w-full sm:w-auto"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="w-full mb-8 md:mb-10">
          {/* Mobile Tab Navigation */}
          <div className="md:hidden mb-4">
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4">
              {[
                { value: "overview", label: "Overview", icon: <TrendingUp className="h-3.5 w-3.5" /> },
                { value: "users", label: "Users", icon: <Users className="h-3.5 w-3.5" /> },
                { value: "properties", label: "Properties", icon: <Building className="h-3.5 w-3.5" /> },
                { value: "inquiries", label: "Inquiries", icon: <MessageSquare className="h-3.5 w-3.5" /> },
                { value: "branding", label: "Branding", icon: <Palette className="h-3.5 w-3.5" /> },
                { value: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
                { value: "marketing", label: "Marketing", icon: <Target className="h-3.5 w-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.value}
                  className={`whitespace-nowrap flex-shrink-0 px-4 py-2 text-xs uppercase tracking-widest border transition-colors ${
                    activeTab === tab.value
                      ? "bg-luxe-bronze text-luxe-bg border-luxe-bronze"
                      : "bg-transparent border-luxe-border/50 text-luxe-text-muted hover:text-luxe-bronze hover:border-luxe-bronze/40"
                  }`}
                  onClick={() => {
                    setActiveTab(tab.value);
                    if (tab.value === "properties") {
                      setTimeout(() => {
                        const el = document.getElementById("properties-section");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 100);
                    }
                  }}
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

                <TabsTrigger
                  value="users"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <Users className="h-3.5 w-3.5 mr-2" />
                  Users
                </TabsTrigger>

                <TabsTrigger
                  value="properties"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <Building className="h-3.5 w-3.5 mr-2" />
                  Properties
                </TabsTrigger>

                <TabsTrigger
                  value="inquiries"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />
                  Inquiries
                </TabsTrigger>

                <TabsTrigger
                  value="branding"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <Palette className="h-3.5 w-3.5 mr-2" />
                  Branding
                </TabsTrigger>

                <TabsTrigger
                  value="analytics"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-2" />
                  Analytics
                </TabsTrigger>

                <TabsTrigger
                  value="marketing"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  <Target className="h-3.5 w-3.5 mr-2" />
                  Marketing
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-luxe-border/30 border border-luxe-border/30">
              <div className="bg-luxe-bg p-6 md:p-8">
                <Users className="h-5 w-5 text-luxe-bronze mb-4" strokeWidth={1.5} />
                <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-2">Total Users</p>
                <p className="font-serif text-3xl md:text-4xl text-luxe-text">{users?.length || 0}</p>
              </div>

              <div className="bg-luxe-bg p-6 md:p-8">
                <Building className="h-5 w-5 text-luxe-bronze mb-4" strokeWidth={1.5} />
                <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-2">Total Properties</p>
                <p className="font-serif text-3xl md:text-4xl text-luxe-text">—</p>
              </div>

              <div className="bg-luxe-bg p-6 md:p-8">
                <User className="h-5 w-5 text-luxe-bronze mb-4" strokeWidth={1.5} />
                <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-2">Active Agents</p>
                <p className="font-serif text-3xl md:text-4xl text-luxe-text">
                  {users?.filter((u: UserType) => u.role === 'agent' && u.isActive).length || 0}
                </p>
              </div>

              <div className="bg-luxe-bg p-6 md:p-8">
                <MessageSquare className="h-5 w-5 text-luxe-bronze mb-4" strokeWidth={1.5} />
                <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-2">Total Inquiries</p>
                <p className="font-serif text-3xl md:text-4xl text-luxe-text">—</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
                <CardHeader>
                  <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                    <Users className="h-5 w-5 text-luxe-bronze mr-2" />
                    Recent Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users?.slice(0, 5).map((userData: UserType) => (
                      <div key={userData.id} className="flex items-center justify-between p-3 bg-luxe-surface-light rounded-lg">
                        <div>
                          <p className="text-luxe-text font-medium">{userData.name}</p>
                          <p className="text-luxe-text-muted text-sm">{userData.email}</p>
                        </div>
                        <Badge className={`text-[10px] uppercase tracking-widest border rounded-none ${
                          userData.role === 'admin'
                            ? 'bg-luxe-bronze/15 text-luxe-bronze border-luxe-bronze/40'
                            : userData.role === 'agent'
                            ? 'bg-luxe-surface-light text-luxe-text border-luxe-border'
                            : 'bg-transparent text-luxe-text-muted border-luxe-border/50'
                        }`}>
                          {userData.role}
                        </Badge>
                      </div>
                    )) || (
                      <div className="text-center py-4">
                        <p className="text-luxe-text-muted">No users found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
                <CardHeader>
                  <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                    <Building className="h-5 w-5 text-luxe-bronze mr-2" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-luxe-surface-light border border-luxe-border/30">
                      <span className="text-luxe-text text-sm">Database</span>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400/90 border border-emerald-400/30 px-2 py-0.5">
                        Online
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-luxe-surface-light border border-luxe-border/30">
                      <span className="text-luxe-text text-sm">API Status</span>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400/90 border border-emerald-400/30 px-2 py-0.5">
                        Operational
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-luxe-surface-light border border-luxe-border/30">
                      <span className="text-luxe-text text-sm">File Upload Service</span>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400/90 border border-emerald-400/30 px-2 py-0.5">
                        Active
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                  <Users className="h-5 w-5 text-luxe-bronze mr-2" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-luxe-surface-light rounded-lg animate-pulse">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-luxe-bronze/15 rounded w-1/4"></div>
                          <div className="h-3 bg-luxe-bronze/10 rounded w-1/2"></div>
                        </div>
                        <div className="h-6 bg-luxe-bronze/15 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users?.map((userData: UserType) => (
                      <div key={userData.id} className="flex items-center justify-between p-4 bg-luxe-surface-light border border-luxe-border/30">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="text-luxe-text font-medium">{userData.name}</p>
                              <p className="text-luxe-text-muted text-sm">{userData.email}</p>
                              {userData.phone && (
                                <p className="text-luxe-text-muted text-xs">{userData.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 ${
                            !userData.isActive
                              ? 'text-rose-400/90 border-rose-400/30'
                              : 'text-emerald-400/90 border-emerald-400/30'
                          }`}>
                            {userData.isActive ? 'Active' : 'Inactive'}
                          </span>
                          
                          <div className="relative">
                            {userData.id === user.id && (
                              <span className="text-xs text-luxe-text-muted/60 absolute -top-5 right-0 whitespace-nowrap">
                                You can't change your own role
                              </span>
                            )}
                            <Select
                              value={userData.role}
                              onValueChange={(newRole) => handleRoleChange(userData.id, newRole)}
                              disabled={updateUserRoleMutation.isPending || userData.id === user.id}
                            >
                              <SelectTrigger className={`w-32 bg-luxe-surface border-luxe-border/50 text-luxe-text rounded-none text-xs uppercase tracking-widest ${userData.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-luxe-surface border-luxe-border/50">
                                <SelectItem value="client" className="text-luxe-text hover:bg-luxe-bronze/15">Client</SelectItem>
                                <SelectItem value="agent" className="text-luxe-text hover:bg-luxe-bronze/15">Agent</SelectItem>
                                <SelectItem value="admin" className="text-luxe-text hover:bg-luxe-bronze/15">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-luxe-bronze mx-auto mb-4 opacity-50" />
                        <p className="text-luxe-text-muted text-lg">No users found</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" id="properties-section">
            <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                  <Building className="h-5 w-5 text-luxe-bronze mr-2" />
                  Property Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PropertyGrid showActions onEdit={handleEditProperty} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiries Tab */}
          <TabsContent value="inquiries">
            <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                  <MessageSquare className="h-5 w-5 text-luxe-bronze mr-2" />
                  All Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-luxe-bronze mx-auto mb-4 opacity-50" />
                  <p className="text-luxe-text-muted text-lg">No inquiries yet</p>
                  <p className="text-luxe-text-muted/60 text-sm">
                    Property inquiries from clients will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
              </TabsContent>
              
              {/* Branding Tab */}
              <TabsContent value="branding">
                <BrandCustomization />
              </TabsContent>
              
              {/* Analytics Tab */}
              <TabsContent value="analytics">
                <AnalyticsDashboard />
              </TabsContent>
              
              {/* Marketing Tab */}
              <TabsContent value="marketing">
                <MarketingAnalytics />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Mobile Content (outside of desktop Tabs component) */}
        <div className="md:hidden">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-px bg-luxe-border/30 border border-luxe-border/30">
                <div className="bg-luxe-bg p-5">
                  <Users className="h-4 w-4 text-luxe-bronze mb-3" strokeWidth={1.5} />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-1.5">Total Users</p>
                  <p className="font-serif text-2xl text-luxe-text">{users?.length || 0}</p>
                </div>
                <div className="bg-luxe-bg p-5">
                  <Building className="h-4 w-4 text-luxe-bronze mb-3" strokeWidth={1.5} />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mb-1.5">Properties</p>
                  <p className="font-serif text-2xl text-luxe-text">—</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                  <Users className="h-5 w-5 text-luxe-bronze mr-2" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-luxe-bronze border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-luxe-text-muted">Loading users...</p>
                  </div>
                ) : users && users.length > 0 ? (
                  users.map((userItem: UserType) => (
                    <div key={userItem.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-luxe-surface-light border border-luxe-border/30 space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-luxe-bronze/15 border border-luxe-bronze/30 flex items-center justify-center">
                            <User className="h-4 w-4 text-luxe-bronze" />
                          </div>
                          <div>
                            <h3 className="text-luxe-text font-medium">{userItem.name}</h3>
                            <p className="text-luxe-text-muted text-sm">{userItem.email}</p>
                            {userItem.phone && (
                              <p className="text-luxe-text-muted/60 text-xs">{userItem.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 ${
                          userItem.isActive
                            ? "text-emerald-400/90 border-emerald-400/30"
                            : "text-rose-400/90 border-rose-400/30"
                        }`}>
                          {userItem.isActive ? "Active" : "Inactive"}
                        </span>

                        <Select
                          value={userItem.role}
                          onValueChange={(value) => handleRoleChange(userItem.id, value)}
                          disabled={userItem.id === user?.id}
                        >
                          <SelectTrigger className="w-28 bg-luxe-surface border-luxe-border/50 text-luxe-text rounded-none text-xs uppercase tracking-widest">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-luxe-surface border-luxe-border/50">
                            <SelectItem value="client" className="text-luxe-text">Client</SelectItem>
                            <SelectItem value="agent" className="text-luxe-text">Agent</SelectItem>
                            <SelectItem value="admin" className="text-luxe-text">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {userItem.id === user?.id && (
                        <div className="text-center sm:text-left">
                          <p className="text-luxe-bronze text-xs font-medium">You can't change your own role</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-luxe-bronze mx-auto mb-4 opacity-50" />
                    <p className="text-luxe-text-muted text-lg">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "properties" && (
            <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                  <Building className="h-5 w-5 text-luxe-bronze mr-2" />
                  Property Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PropertyGrid showActions onEdit={handleEditProperty} />
              </CardContent>
            </Card>
          )}

          {activeTab === "inquiries" && (
            <Card className="bg-luxe-surface border border-luxe-border/50 rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-luxe-text text-xl flex items-center">
                  <MessageSquare className="h-5 w-5 text-luxe-bronze mr-2" />
                  All Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-luxe-bronze mx-auto mb-4 opacity-50" />
                  <p className="text-luxe-text-muted text-lg">No inquiries yet</p>
                  <p className="text-luxe-text-muted/60 text-sm">
                    Property inquiries from clients will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "branding" && (
            <BrandCustomization />
          )}

          {activeTab === "analytics" && (
            <AnalyticsDashboard />
          )}

          {activeTab === "marketing" && (
            <MarketingAnalytics />
          )}
        </div>
      </main>
    </div>
  );
}
