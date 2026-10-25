import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, lazy, Suspense } from "react";
import { getAuthToken } from "@/lib/authUtils";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { ThemeProvider } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";

// Lazy load pages for better performance
const HomePage = lazy(() => import("@/pages/home"));
const LoginPage = lazy(() => import("@/pages/login"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const AdminDashboardPage = lazy(() => import("@/pages/admin-dashboard"));
const PropertyDetail = lazy(() => import("@/pages/property-detail"));
const Subscription = lazy(() => import("@/pages/subscription"));
const NotFound = lazy(() => import("@/pages/not-found"));
const DealRoomPage = lazy(() => import("@/pages/deal-room"));

// Update queryClient to include auth token in headers
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, config = {}] = args;
  const token = getAuthToken();
  
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  
  return originalFetch(url, config);
};

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // Track page views when routes change
  useAnalytics();

  // Show minimal loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-luxury-black">
        {/* Instant header skeleton */}
        <div className="bg-luxury-black-medium border-b border-luxury-gold/20">
          <div className="container mx-auto px-4 py-4">
            <div className="h-8 w-40 bg-luxury-black-light animate-pulse rounded"></div>
          </div>
        </div>
        
        {/* Hero section skeleton */}
        <div className="h-[600px] bg-luxury-black-light animate-pulse"></div>
        
        {/* Content skeleton */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-luxury-black-light animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-luxury-black flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-luxury-gold/20 rounded mb-4"></div>
          <div className="h-4 w-32 bg-luxury-gold/10 rounded mx-auto"></div>
        </div>
      </div>
    }>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/property/:id" component={PropertyDetail} />
        <Route path="/dashboard">
          {isAuthenticated ? <DashboardPage /> : <LoginPage />}
        </Route>
        <Route path="/subscription">
          {isAuthenticated ? <Subscription /> : <LoginPage />}
        </Route>
        <Route path="/admin">
          {isAuthenticated && user?.role === 'admin' ? <AdminDashboardPage /> : <LoginPage />}
        </Route>
        <Route path="/deal-room" component={DealRoomPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const { toast } = useToast();
  
  // Show welcome notification on first load
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('welcome-shown');
    if (!hasShownWelcome) {
      setTimeout(() => {
        toast({
          title: "Welcome to PrestigeEdge",
          description: "Discover luxury real estate at its finest.",
          className: "bg-background border-luxury-gold/30 shadow-2xl",
        });
        sessionStorage.setItem('welcome-shown', 'true');
      }, 1000);
    }
  }, [toast]);
  
  return <Router />;
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Google Analytics not configured. Add VITE_GA_MEASUREMENT_ID to Secrets for professional analytics tracking.');
    } else {
      initGA();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
