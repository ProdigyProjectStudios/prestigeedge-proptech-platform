"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  TrendingUp,
  Heart,
  Building,
  MessageSquare,
  Home,
  Sparkles,
  Mail,
  User,
  LogOut,
  Calendar,
  BarChart3,
  Megaphone,
  Palette,
  Users as UsersIcon,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardMobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: 'admin' | 'agent' | 'client';
  onLogout: () => void;
}

export function DashboardMobileMenu({
  activeTab,
  onTabChange,
  userRole,
  onLogout,
}: DashboardMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getTabOptions = () => {
    const currentPath = window.location.pathname;
    const isAdminDashboard = currentPath.includes('/admin');

    if (isAdminDashboard) {
      return [
        { value: "overview", label: "Overview", icon: <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "users", label: "Users", icon: <UsersIcon className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "properties", label: "Properties", icon: <Building className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "inquiries", label: "Inquiries", icon: <MessageSquare className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "branding", label: "Branding", icon: <Palette className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "marketing", label: "Marketing", icon: <Megaphone className="h-4 w-4" strokeWidth={1.5} /> },
      ];
    }

    const baseOptions = [
      { value: "overview", label: "Overview", icon: <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> },
      { value: "inquiries", label: "Inquiries", icon: <MessageSquare className="h-4 w-4" strokeWidth={1.5} /> },
    ];

    if (userRole === 'client') {
      return [
        ...baseOptions,
        { value: "saved", label: "Saved Properties", icon: <Heart className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "viewings", label: "Viewings", icon: <Home className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "ai-recommendations", label: "AI Recommendations", icon: <Sparkles className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "profile", label: "Profile", icon: <User className="h-4 w-4" strokeWidth={1.5} /> },
      ];
    }

    if (userRole === 'agent' || userRole === 'admin') {
      const options = [
        ...baseOptions,
        { value: "properties", label: "My Properties", icon: <Building className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "consultations", label: "Consultations", icon: <Calendar className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "ai-tools", label: "AI Tools", icon: <Sparkles className="h-4 w-4" strokeWidth={1.5} /> },
        { value: "profile", label: "Profile", icon: <User className="h-4 w-4" strokeWidth={1.5} /> },
      ];

      if (userRole === 'admin') {
        options.splice(-1, 0, { value: "email-settings", label: "Email Settings", icon: <Mail className="h-4 w-4" strokeWidth={1.5} /> });
      }

      return options;
    }

    return baseOptions;
  };

  const handleTabSelect = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-luxe-text-muted hover:text-luxe-bronze hover:bg-transparent rounded-none"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-80 bg-luxe-bg border-l border-luxe-border/50 p-0"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center h-14 px-6 border-b border-luxe-border/30">
            <span className="font-serif text-lg tracking-wide text-luxe-text">
              PRESTIGE<span className="text-luxe-bronze">EDGE</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted/70 mb-4">
                Dashboard
              </div>
              <div className="space-y-1">
                {getTabOptions().map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleTabSelect(tab.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide border-l-2 transition-colors ${
                      activeTab === tab.value
                        ? "border-luxe-bronze text-luxe-bronze bg-luxe-surface-light/40"
                        : "border-transparent text-luxe-text-muted hover:text-luxe-text hover:border-luxe-border"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-luxe-border/30">
              <div className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted/70 mb-4">
                Navigation
              </div>
              <div className="space-y-1">
                <Link href="/">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide border-l-2 border-transparent text-luxe-text-muted hover:text-luxe-text hover:border-luxe-border"
                  >
                    <Home className="h-4 w-4" strokeWidth={1.5} />
                    <span>Home</span>
                  </button>
                </Link>

                {userRole === 'admin' && (
                  <Link href="/admin">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide border-l-2 border-transparent text-luxe-text-muted hover:text-luxe-text hover:border-luxe-border"
                    >
                      <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                      <span>Admin Panel</span>
                    </button>
                  </Link>
                )}

                <button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide border-l-2 border-transparent text-luxe-text-muted hover:text-luxe-bronze hover:border-luxe-bronze/40"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
