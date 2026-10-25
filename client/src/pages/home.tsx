"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  MapPin,
  Bed,
  Bath,
  Square,
  Phone,
  Mail,
  TrendingUp,
  Award,
  Building,
  ChevronRight,
  ChevronLeft,
  Play,
  User,
  Heart,
  Filter,
  ArrowRight,
  Menu
} from "lucide-react"
import { Link, useLocation } from "wouter"
import { useAuth, useLogout } from "@/hooks/useAuth"
import { getProperties, getFeaturedProperties, type Property } from "@/lib/properties"
import { LuxuryBackground } from "@/components/ui/luxury-background"
import { LuxuryHeroSlider } from "@/components/ui/luxury-hero-slider"
import { VirtualTour } from "@/components/property/virtual-tour"
import { AdvancedSearch } from "@/components/search/advanced-search"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import { SEOHead } from "@/components/seo/seo-head"
import { AIChatbot } from "@/components/ai/ai-chatbot"
import { MobileMenu } from "@/components/ui/mobile-menu"
import { FloatingParticles } from "@/components/ui/floating-particles"
import { useScrollRestoration } from "@/hooks/useScrollRestoration"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isAfter } from "date-fns"
import VictoriaSterlingImage from "@/assets/agents/victoria-sterling.jpg"
import AlexanderChenImage from "@/assets/agents/alexander-chen.jpg"
import IsabellaRodriguezImage from "@/assets/agents/isabella-rodriguez.jpg"

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const logoutMutation = useLogout()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [, navigate] = useLocation()
  const [currentPage, setCurrentPage] = useState(1)
  // Handle scroll position restoration
  useEffect(() => {
    // Save current scroll position before navigating away
    const handleBeforeUnload = () => {
      sessionStorage.setItem('scroll-home', JSON.stringify({
        x: window.scrollX,
        y: window.scrollY,
        time: Date.now()
      }));
    };

    // Restore scroll position when coming back via browser back button
    const handlePopState = () => {
      const savedPosition = sessionStorage.getItem('scroll-home');
      if (savedPosition) {
        const position = JSON.parse(savedPosition);
        // Only restore if position was saved recently (within 5 minutes)
        if (Date.now() - position.time < 300000) {
          setTimeout(() => {
            window.scrollTo(position.x, position.y);
          }, 100);
        }
      }
    };

    // Check if we should restore scroll position on initial load
    const savedPosition = sessionStorage.getItem('scroll-home');
    const isNavigatingBack = window.performance && window.performance.navigation.type === 2;
    
    if (savedPosition && isNavigatingBack) {
      const position = JSON.parse(savedPosition);
      if (Date.now() - position.time < 300000) {
        setTimeout(() => {
          window.scrollTo(position.x, position.y);
        }, 100);
      }
    } else if (!savedPosition) {
      // For fresh loads, scroll to top
      window.scrollTo(0, 0);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Save scroll position before navigating to property details - use SPA navigation
  const handlePropertyClick = (propertyId: string) => {
    // Save current scroll position with timestamp
    sessionStorage.setItem('scroll-home', JSON.stringify({
      x: window.scrollX,
      y: window.scrollY,
      time: Date.now()
    }));
    // Use SPA navigation for smooth transition
    navigate(`/property/${propertyId}`);
  }

  // Handle schedule tour from hero slider
  const handleScheduleTour = (propertyId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Please login",
        description: "You need to be logged in to schedule tours",
        variant: "destructive",
      });
      return;
    }

    if (user?.role !== 'client') {
      toast({
        title: "Client access required",
        description: "Only clients can schedule property tours",
        variant: "destructive",
      });
      return;
    }

    // Find the property to schedule tour for
    const property = featuredProperties?.find(p => p.id === propertyId);
    if (property) {
      setSelectedPropertyForTour(property);
      setScheduleTourOpen(true);
    } else {
      toast({
        title: "Property not found",
        description: "Unable to schedule tour for this property",
        variant: "destructive",
      });
    }
  }
  const [virtualTourOpen, setVirtualTourOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false)
  const [chatbotOpen, setChatbotOpen] = useState(false)
  const [scheduleTourOpen, setScheduleTourOpen] = useState(false)
  const [selectedPropertyForTour, setSelectedPropertyForTour] = useState<Property | null>(null)
  const [consultationOpen, setConsultationOpen] = useState(false)
  
  // Debug: Log consultation state changes
  useEffect(() => {
    console.log('Consultation modal state:', consultationOpen);
  }, [consultationOpen]);

  // Schedule viewing form schema
  const scheduleViewingSchema = z.object({
    propertyId: z.string().min(1, 'Property is required'),
    agentId: z.string().min(1, 'Please select an agent'),
    viewingDate: z.date({
      required_error: 'Please select a date',
    }).refine((date) => isAfter(date, new Date()), {
      message: 'Viewing date must be in the future',
    }),
    timeSlot: z.string().min(1, 'Please select a time slot'),
    notes: z.string().optional(),
  })

  // Consultation booking form schema
  const consultationSchema = z.object({
    clientName: z.string().min(1, 'Please enter your name'),
    clientEmail: z.string().email('Please enter a valid email address'),
    clientPhone: z.string().optional(),
    consultationType: z.string().min(1, 'Please select a consultation type'),
    agentId: z.string().min(1, 'Please select an agent'),
    consultationDate: z.date({
      required_error: 'Please select a date',
    }).refine((date) => isAfter(date, new Date()), {
      message: 'Consultation date must be in the future',
    }),
    timeSlot: z.string().min(1, 'Please select a time slot'),
    notes: z.string().optional(),
  })

  type ScheduleViewingData = z.infer<typeof scheduleViewingSchema>
  type ConsultationData = z.infer<typeof consultationSchema>

  const TIME_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ]

  const CONSULTATION_TYPES = [
    'Investment Strategy',
    'Property Acquisition',
    'Portfolio Review',
    'Market Analysis',
    'Luxury Lifestyle Planning'
  ]

  const form = useForm<ScheduleViewingData>({
    resolver: zodResolver(scheduleViewingSchema),
    defaultValues: {
      propertyId: '',
      agentId: '',
      timeSlot: '',
      notes: '',
    },
  })

  const consultationForm = useForm<ConsultationData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      consultationType: '',
      agentId: '',
      timeSlot: '',
      notes: '',
    },
  })

  // Schedule viewing mutation
  const scheduleViewingMutation = useMutation({
    mutationFn: (data: ScheduleViewingData) => {
      const dateTime = new Date(data.viewingDate)
      const [time, period] = data.timeSlot.split(' ')
      const [hours, minutes] = time.split(':')
      let hour = parseInt(hours)
      
      if (period === 'PM' && hour !== 12) hour += 12
      if (period === 'AM' && hour === 12) hour = 0
      
      dateTime.setHours(hour, parseInt(minutes), 0, 0)

      return apiRequest('POST', '/api/viewings', {
        propertyId: data.propertyId,
        agentId: data.agentId,
        viewingDate: dateTime.toISOString(),
        notes: data.notes,
        status: 'scheduled',
      })
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Property viewing scheduled successfully! We will contact you to confirm.',
      })
      setScheduleTourOpen(false)
      setSelectedPropertyForTour(null)
      form.reset()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule viewing',
        variant: 'destructive',
      })
    },
  })

  // Get agents for the form
  const { data: agentsData } = useQuery<any[]>({
    queryKey: ['/api/agents'],
    enabled: scheduleTourOpen || consultationOpen,
  })

  const agents = agentsData || []

  // Set selected property when scheduling tour
  useEffect(() => {
    if (selectedPropertyForTour && scheduleTourOpen) {
      form.setValue('propertyId', selectedPropertyForTour.id)
    }
  }, [selectedPropertyForTour, scheduleTourOpen, form])

  const handleScheduleViewing = (data: ScheduleViewingData) => {
    scheduleViewingMutation.mutate(data)
  }

  // Schedule consultation mutation
  const scheduleConsultationMutation = useMutation({
    mutationFn: (data: ConsultationData) => {
      const dateTime = new Date(data.consultationDate)
      const [time, period] = data.timeSlot.split(' ')
      const [hours, minutes] = time.split(':')
      let hour = parseInt(hours)
      
      if (period === 'PM' && hour !== 12) hour += 12
      if (period === 'AM' && hour === 12) hour = 0
      
      dateTime.setHours(hour, parseInt(minutes), 0, 0)

      return apiRequest('POST', '/api/consultations', {
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        consultationType: data.consultationType,
        agentId: data.agentId,
        consultationDate: dateTime.toISOString(),
        timeSlot: data.timeSlot,
        notes: data.notes,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Private consultation scheduled successfully! We will contact you to confirm.',
      })
      setConsultationOpen(false)
      consultationForm.reset()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule consultation',
        variant: 'destructive',
      })
    },
  })

  const handleScheduleConsultation = (data: ConsultationData) => {
    scheduleConsultationMutation.mutate(data)
  }
  const [searchParams, setSearchParams] = useState({
    location: "",
    propertyType: "",
    priceRange: ""
  })

  const { data: propertiesData, isLoading } = useQuery({
    queryKey: ["/api/properties", { page: currentPage, limit: 6, ...searchParams }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '6');
      
      if (searchParams.location) {
        params.append('location', searchParams.location);
      }
      if (searchParams.propertyType && searchParams.propertyType !== 'All Types') {
        params.append('propertyType', searchParams.propertyType);
      }
      if (searchParams.priceRange && searchParams.priceRange !== 'Any Price') {
        // Parse price range like "$1M - $5M" into min/max values
        const priceRangeMap: { [key: string]: { min?: number, max?: number } } = {
          "$1M - $5M": { min: 1000000, max: 5000000 },
          "$5M - $10M": { min: 5000000, max: 10000000 },
          "$10M - $25M": { min: 10000000, max: 25000000 },
          "$25M+": { min: 25000000 }
        };
        const range = priceRangeMap[searchParams.priceRange];
        if (range) {
          if (range.min) params.append('minPrice', range.min.toString());
          if (range.max) params.append('maxPrice', range.max.toString());
        }
      }
      
      const response = await fetch(`/api/properties?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return await response.json();
    },
  })

  // Fetch saved properties if user is authenticated
  const { data: savedProperties = [] } = useQuery<Property[]>({
    queryKey: ["/api/saved-properties"],
    enabled: isAuthenticated,
  })

  // Local state for optimistic updates
  const [optimisticallyLiked, setOptimisticallyLiked] = useState<Set<string>>(new Set());

  // Save property mutation with optimistic updates
  const savePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      await apiRequest("POST", `/api/saved-properties/${propertyId}`);
    },
    onMutate: async (propertyId: string) => {
      // Optimistically add to liked set
      setOptimisticallyLiked(prev => new Set(prev).add(propertyId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({
        title: "Success",
        description: "Property saved to your favorites",
      });
    },
    onError: (error, propertyId) => {
      // Revert optimistic update on error
      setOptimisticallyLiked(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });
      toast({
        title: "Error",
        description: error.message || "Failed to save property",
        variant: "destructive",
      });
    },
  });

  // Unsave property mutation with optimistic updates
  const unsavePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      await apiRequest("DELETE", `/api/saved-properties/${propertyId}`);
    },
    onMutate: async (propertyId: string) => {
      // Optimistically remove from liked set
      setOptimisticallyLiked(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({
        title: "Success",
        description: "Property removed from favorites",
      });
    },
    onError: (error, propertyId) => {
      // Revert optimistic update on error
      setOptimisticallyLiked(prev => new Set(prev).add(propertyId));
      toast({
        title: "Error",
        description: error.message || "Failed to remove property",
        variant: "destructive",
      });
    },
  });

  const isPropertySaved = (propertyId: string) => {
    // Check optimistic state first, then fallback to actual saved properties
    if (optimisticallyLiked.has(propertyId)) return true;
    return savedProperties.some((p) => p.id === propertyId);
  };

  const toggleSaveProperty = (propertyId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Please login",
        description: "You need to be logged in to save properties",
        variant: "destructive",
      });
      return;
    }

    if (isPropertySaved(propertyId)) {
      unsavePropertyMutation.mutate(propertyId);
    } else {
      savePropertyMutation.mutate(propertyId);
    }
  }

  // Handle advanced search
  const handleAdvancedSearch = (filters: any) => {
    // Update search parameters with advanced filters
    const newParams = new URLSearchParams(searchParams.toString());
    
    // Clear existing filters first
    newParams.delete('location');
    newParams.delete('propertyType');
    newParams.delete('minPrice');
    newParams.delete('maxPrice');
    newParams.delete('beds');
    newParams.delete('baths');
    newParams.delete('minSqft');
    newParams.delete('maxSqft');
    newParams.delete('status');
    newParams.delete('featured');
    newParams.delete('features');
    
    // Add new filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, value.toString());
      }
    });
    
    // Update URL and trigger search
    const newSearchParams = Object.fromEntries(newParams);
    setSearchParams({
      location: newSearchParams.location || "",
      propertyType: newSearchParams.propertyType || "",
      priceRange: newSearchParams.priceRange || ""
    });
    setCurrentPage(1);
    setAdvancedSearchOpen(false);
    
    toast({
      title: "Advanced Search Applied",
      description: `Found properties matching your criteria`,
    });
  };

  const handleBasicSearch = () => {
    // Reset to first page when searching
    setCurrentPage(1);
    // The query will automatically refetch due to searchParams dependency
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (propertiesData?.totalPages || 1) && page !== currentPage) {
      setCurrentPage(page)
      // Smooth scroll to properties section
      scrollToProperties()
    }
  }

  const scrollToProperties = () => {
    const propertiesSection = document.getElementById("properties-section")
    if (propertiesSection) {
      propertiesSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const properties = propertiesData?.properties || []
  const totalPages = propertiesData?.totalPages || 1

  // Get featured properties for hero slider
  const { data: featuredProperties, isLoading: isFeaturedLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties/featured"],
    queryFn: getFeaturedProperties,
  });

  // Create hero slides from featured properties - only use actual data, no fallback
  const heroSlides = featuredProperties?.slice(0, 5).map((property) => ({
    id: `slide-${property.id}`,
    propertyId: property.id,
    image: property.images?.[0] || "https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    title: property.title,
    subtitle: property.description.length > 100 ? property.description.substring(0, 100) + "..." : property.description,
    location: property.location,
    price: formatPrice(property.price)
  })) ?? [
    // Fallback slides if no featured properties
    {
      id: "slide-1",
      propertyId: "4de81a6e-5db7-48db-a7da-fd4fe2374c71", // Silicon Valley Tech Mansion
      image: "https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      title: "Silicon Valley Tech Mansion",
      subtitle: "Breathtaking waterfront estate with panoramic views and private beach access",
      location: "Atherton, California",
      price: "$28.5M"
    },
    {
      id: "slide-2", 
      propertyId: "f3f438d6-6545-4021-bcc7-5de0518afb45", // Hamptons Oceanfront Estate
      image: "https://images.pexels.com/photos/8134745/pexels-photo-8134745.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      title: "Hamptons Oceanfront Estate",
      subtitle: "Contemporary architectural marvel with infinity pool and smart home technology",
      location: "Hamptons, New York",
      price: "$22.0M"
    },
    {
      id: "slide-3",
      propertyId: "8154f20f-19f0-4a7e-b50a-a73b054e2ccf", // Napa Valley Vineyard Estate
      image: "https://images.pexels.com/photos/33129807/pexels-photo-33129807.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      title: "Napa Valley Vineyard Estate",
      subtitle: "Spectacular stone estate with terraced gardens and mountain vistas",
      location: "Napa Valley, California", 
      price: "$19.5M"
    },
    {
      id: "slide-4",
      propertyId: "20285bf4-4fa2-42c1-a738-b027f460b606", // Oceanfront Villa - Malibu Estate
      image: "https://images.pexels.com/photos/1694360/pexels-photo-1694360.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      title: "Oceanfront Villa - Malibu Estate",
      subtitle: "Meticulously restored French manor with original architectural details",
      location: "Malibu, California",
      price: "$18.75M"
    },
    {
      id: "slide-5",
      propertyId: "6d27c828-fd24-4a81-859e-5e819758a7d2", // San Francisco Pacific Heights Mansion
      image: "https://images.pexels.com/photos/7031607/pexels-photo-7031607.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      title: "San Francisco Pacific Heights Mansion",
      subtitle: "Ultra-modern glass estate with floor-to-ceiling windows and city views",
      location: "San Francisco, California",
      price: "$16.8M"
    }
  ]

  return (
    <div className="min-h-screen bg-luxe-bg relative">

      <SEOHead
        title="PrestigeEdge - Luxury Real Estate | Premium Properties & Estates"
        description="Discover exclusive luxury properties, mansions, penthouses, and estates. Premium real estate portfolio with $3.75M - $28.5M properties across major US markets. Expert agents, virtual tours, and personalized service."
        image="/luxury-hero-bg.jpg"
        type="website"
      />


      {/* LUXE Minimal Navigation */}
      <nav className="fixed top-0 w-full bg-luxe-bg/95 backdrop-blur-sm z-50 border-b border-luxe-border/30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 md:h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="font-serif text-lg md:text-xl tracking-wide text-luxe-text">
                PRESTIGE<span className="text-luxe-bronze">EDGE</span>
              </span>
            </Link>

            {/* Desktop Navigation - Centered */}
            <div className="hidden md:flex items-center space-x-10">
              <Link
                href="#properties-section"
                className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors duration-300"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById("properties-section")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Properties
              </Link>
              <Link
                href="#services-section"
                className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors duration-300"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Services
              </Link>
              <Link
                href="#agents-section"
                className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors duration-300"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById("agents-section")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Agents
              </Link>
              <Link
                href="#contact-section"
                className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors duration-300"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById("contact-section")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Contact
              </Link>
              <Link
                href="/deal-room"
                className="text-xs uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors duration-300"
              >
                Deal Room
              </Link>
            </div>

            {/* Right Side - Auth */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2">
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-luxe-text-muted hover:text-luxe-bronze transition-colors h-8 px-3"
                      >
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        Dashboard
                      </Button>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-luxe-text-muted hover:text-luxe-bronze transition-colors h-8 px-3"
                        >
                          Admin
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => logoutMutation.mutate()}
                      className="text-xs text-luxe-text-muted hover:text-luxe-bronze transition-colors h-8 px-3"
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-luxe-text-muted hover:text-luxe-bronze transition-colors h-8 px-3"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button size="sm" className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light transition-colors text-xs px-4 h-8">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              
              {/* Mobile Menu */}
              <MobileMenu 
                isAuthenticated={isAuthenticated}
                user={user}
                onLogout={() => logoutMutation.mutate()}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Luxury Slider */}
      <section className="relative h-screen">
        {featuredProperties && heroSlides.length > 0 ? (
          <LuxuryHeroSlider 
            slides={heroSlides} 
            autoPlayInterval={6000}
            onViewDetails={handlePropertyClick}
            onScheduleTour={handleScheduleTour}
          />
        ) : (
          <div className="absolute inset-0 bg-luxe-bg">
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="h-1 w-48 bg-luxe-bronze/20 rounded mb-3 mx-auto animate-pulse"></div>
                <div className="h-1 w-32 bg-luxe-bronze/10 rounded mx-auto animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* LUXE Stats Section - Clean and Minimal */}
      <section className="py-10 md:py-14 bg-luxe-surface relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="text-center">
                <div className="font-serif text-3xl md:text-5xl font-normal text-luxe-bronze mb-2 tracking-wide">
                  $15B+
                </div>
                <div className="text-luxe-text-muted text-xs uppercase tracking-[0.2em]">Properties Sold</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="text-center">
                <div className="font-serif text-3xl md:text-5xl font-normal text-luxe-bronze mb-2 tracking-wide">
                  50K+
                </div>
                <div className="text-luxe-text-muted text-xs uppercase tracking-[0.2em]">Clients</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="text-center">
                <div className="font-serif text-3xl md:text-5xl font-normal text-luxe-bronze mb-2 tracking-wide">
                  200+
                </div>
                <div className="text-luxe-text-muted text-xs uppercase tracking-[0.2em]">Agents</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="text-center">
                <div className="font-serif text-3xl md:text-5xl font-normal text-luxe-bronze mb-2 tracking-wide">
                  50+
                </div>
                <div className="text-luxe-text-muted text-xs uppercase tracking-[0.2em]">Years</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LUXE Property Search Section */}
      <section className="py-10 md:py-14 bg-luxe-bg relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="text-center mb-6 md:mb-8">
              <h2 className="font-serif text-2xl md:text-4xl font-normal text-luxe-text mb-2 tracking-wide">Find Your Estate</h2>
              <p className="text-sm text-luxe-text-muted max-w-2xl mx-auto">
                Search our exclusive collection of luxury properties
              </p>
            </div>
          </motion.div>

          {/* LUXE Search Bar - Clean minimal design */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-luxe-surface border border-luxe-border/50 rounded-sm p-5 md:p-6 max-w-5xl mx-auto"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs text-luxe-text-muted uppercase tracking-[0.15em]">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-luxe-bronze" />
                  <Input
                    placeholder="City, neighborhood, or ZIP"
                    value={searchParams.location}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
                    className="pl-10 h-12 bg-luxe-bg border-luxe-border text-luxe-text placeholder:text-luxe-text-subtle focus:border-luxe-bronze focus:ring-luxe-bronze/20 rounded-sm text-sm"
                    data-testid="input-location"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-luxe-text-muted uppercase tracking-[0.15em]">Property Type</label>
                <select 
                  value={searchParams.propertyType}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, propertyType: e.target.value }))}
                  className="w-full h-12 px-4 border border-luxe-border rounded-sm bg-luxe-bg text-luxe-text focus:border-luxe-bronze focus:ring-luxe-bronze/20 text-sm"
                  data-testid="select-property-type"
                >
                  <option value="">All Types</option>
                  <option value="Mansion">Mansion</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Estate">Estate</option>
                  <option value="Villa">Villa</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-luxe-text-muted uppercase tracking-[0.15em]">Price Range</label>
                <select 
                  value={searchParams.priceRange}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, priceRange: e.target.value }))}
                  className="w-full h-12 px-4 border border-luxe-border rounded-sm bg-luxe-bg text-luxe-text focus:border-luxe-bronze focus:ring-luxe-bronze/20 text-sm"
                  data-testid="select-price-range"
                >
                  <option value="">Any Price</option>
                  <option value="$1M - $5M">$1M - $5M</option>
                  <option value="$5M - $10M">$5M - $10M</option>
                  <option value="$10M - $25M">$10M - $25M</option>
                  <option value="$25M+">$25M+</option>
                </select>
              </div>
              <div>
                <Button 
                  onClick={handleBasicSearch}
                  className="w-full h-12 bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light transition-colors font-medium text-sm mt-2 lg:mt-0"
                  data-testid="button-search"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </motion.div>
          
          {/* Advanced Search Button */}
          <div className="flex justify-center mt-6">
            <Button 
              variant="ghost"
              className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm group"
              onClick={() => setAdvancedSearchOpen(true)}
              data-testid="button-advanced-search"
            >
              <Filter className="h-4 w-4 mr-2" />
              Advanced Search
              <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </Button>
          </div>
        </div>
      </section>

      {/* LUXE Featured Properties */}
      <section id="properties-section" className="py-12 md:py-16 bg-luxe-surface relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="text-center mb-8 md:mb-10">
              <h2 className="font-serif text-2xl md:text-4xl font-normal text-luxe-text mb-2 tracking-wide">Premium Collection</h2>
              <p className="text-sm text-luxe-text-muted max-w-2xl mx-auto">
                Curated luxury properties from our exclusive portfolio
              </p>
            </div>
          </motion.div>

          {/* LUXE Properties Grid - Clean minimal cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8 md:gap-10 min-h-[400px] md:min-h-[800px]">
            {isLoading
              ? // LUXE Loading skeleton
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden bg-luxe-bg animate-pulse"
                  >
                    <div className="h-72 bg-luxe-surface-light" />
                    <div className="p-6">
                      <div className="h-5 bg-luxe-surface-light rounded mb-3" />
                      <div className="h-6 bg-luxe-surface-light rounded mb-4" />
                      <div className="flex justify-between">
                        <div className="h-4 bg-luxe-surface-light rounded w-16" />
                        <div className="h-4 bg-luxe-surface-light rounded w-16" />
                        <div className="h-4 bg-luxe-surface-light rounded w-16" />
                      </div>
                    </div>
                  </div>
                ))
              : properties.map((property: any, index: number) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                  <div
                    className="group overflow-hidden cursor-pointer h-full bg-luxe-bg"
                    onClick={() => handlePropertyClick(property.id)}
                    data-testid={`card-property-${property.id}`}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={property.images[0] || "/placeholder.svg?height=400&width=600&text=Property"}
                        alt={property.title}
                        className="w-full h-72 object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        loading="lazy"
                        decoding="async"
                      />
                      {property.isFeatured && (
                        <span className="luxe-badge absolute top-4 left-4">
                          FEATURED
                        </span>
                      )}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="sm"
                          className="bg-black/60 backdrop-blur-sm text-luxe-text hover:bg-luxe-bronze hover:text-luxe-bg transition-colors text-xs px-3 py-1.5"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedProperty(property);
                            setVirtualTourOpen(true);
                          }}
                          data-testid={`button-virtual-tour-${property.id}`}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Virtual Tour
                        </Button>
                      </div>
                      
                      {/* Heart icon - minimal */}
                      {isAuthenticated && (
                        <div className="absolute bottom-4 right-4 z-20">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-full transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSaveProperty(property.id);
                            }}
                            disabled={savePropertyMutation.isPending || unsavePropertyMutation.isPending}
                            data-testid={`button-save-${property.id}`}
                          >
                            <Heart 
                              className={`h-4 w-4 transition-colors ${
                                isPropertySaved(property.id) 
                                  ? 'fill-red-500 text-red-500' 
                                  : 'text-white/70 hover:text-red-400'
                              }`} 
                            />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3">
                        <h3 className="font-serif text-lg md:text-xl font-normal text-luxe-text group-hover:text-luxe-bronze transition-colors mb-1 md:mb-0">
                          {property.title}
                        </h3>
                        <div className="text-lg md:text-xl font-medium text-luxe-bronze">{formatPrice(property.price)}</div>
                      </div>
                      <div className="flex items-center text-luxe-text-muted mb-4">
                        <MapPin className="h-4 w-4 mr-1.5 text-luxe-bronze" />
                        <span className="text-sm">{property.location}</span>
                      </div>
                      <div className="flex items-center text-luxe-text-muted text-sm">
                        <span>{property.beds} beds</span>
                        <span className="mx-2">•</span>
                        <span>{property.baths} baths</span>
                        <span className="mx-2">•</span>
                        <span>{property.sqft.toLocaleString()} sqft</span>
                      </div>
                    </div>
                  </div>
                  </motion.div>
                ))}
          </div>

          {/* LUXE Pagination - Minimal */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center mt-12 md:mt-16 space-x-3">
              <Button
                variant="ghost"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>

              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant="ghost"
                    onClick={() => handlePageChange(page)}
                    disabled={isLoading}
                    className={
                      currentPage === page
                        ? "bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light px-3 py-1.5 text-sm"
                        : "text-luxe-text-muted hover:text-luxe-bronze px-3 py-1.5 text-sm"
                    }
                    data-testid={`button-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="ghost"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm"
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* LUXE Services Section */}
      <section id="services-section" className="py-12 md:py-16 bg-luxe-bg relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="text-center mb-8 md:mb-10">
              <h2 className="font-serif text-2xl md:text-4xl font-normal text-luxe-text mb-4 tracking-wide">Our Services</h2>
              <p className="text-base text-luxe-text-muted max-w-2xl mx-auto">
                Comprehensive real estate solutions tailored to discerning clients
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="text-center p-10 bg-luxe-surface border border-luxe-border/30 hover:border-luxe-bronze/40 transition-colors h-full">
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-6">
                  <Building className="h-8 w-8 text-luxe-bronze" />
                </div>
                <h3 className="font-serif text-xl font-normal mb-4 text-luxe-text">Estate Sales</h3>
                <p className="text-luxe-text-muted text-sm leading-relaxed mb-6">
                  Expert guidance in acquiring and selling the world's most exclusive properties.
                </p>
                <Button
                  variant="ghost"
                  className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm group"
                >
                  Learn More
                  <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="text-center p-10 bg-luxe-surface border border-luxe-border/30 hover:border-luxe-bronze/40 transition-colors h-full">
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="h-8 w-8 text-luxe-bronze" />
                </div>
                <h3 className="font-serif text-xl font-normal mb-4 text-luxe-text">Market Analysis</h3>
                <p className="text-luxe-text-muted text-sm leading-relaxed mb-6">
                  Proprietary market insights and investment strategies for informed decisions.
                </p>
                <Button
                  variant="ghost"
                  className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm group"
                >
                  Learn More
                  <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="text-center p-10 bg-luxe-surface border border-luxe-border/30 hover:border-luxe-bronze/40 transition-colors h-full">
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-6">
                  <Award className="h-8 w-8 text-luxe-bronze" />
                </div>
                <h3 className="font-serif text-xl font-normal mb-4 text-luxe-text">Concierge Service</h3>
                <p className="text-luxe-text-muted text-sm leading-relaxed mb-6">
                  White-glove service for discerning clients seeking exceptional experiences.
                </p>
                <Button
                  variant="ghost"
                  className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm group"
                >
                  Learn More
                  <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LUXE Agents Section */}
      <section id="agents-section" className="py-12 md:py-16 bg-luxe-surface relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="text-center mb-8 md:mb-10">
              <h2 className="font-serif text-2xl md:text-4xl font-normal text-luxe-text mb-4 tracking-wide">Our Agents</h2>
              <p className="text-base text-luxe-text-muted max-w-2xl mx-auto">
                World-class professionals with unmatched expertise in luxury real estate
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {[
              {
                name: "Victoria Sterling",
                title: "Luxury Specialist",
                sales: "$500M+ in sales",
                image: VictoriaSterlingImage,
              },
              {
                name: "Alexander Chen",
                title: "Estate Expert",
                sales: "$350M+ in sales",
                image: AlexanderChenImage,
              },
              {
                name: "Isabella Rodriguez",
                title: "Global Advisor",
                sales: "$425M+ in sales",
                image: IsabellaRodriguezImage,
              },
            ].map((agent, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
              <div className="text-center p-8 bg-luxe-bg border border-luxe-border/30 hover:border-luxe-bronze/40 transition-colors">
                <div className="relative w-32 h-32 mx-auto mb-8">
                  <img
                    src={agent.image || "/placeholder.svg?height=128&width=128"}
                    alt={agent.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <h3 className="font-serif text-xl font-normal mb-1 text-luxe-text">{agent.name}</h3>
                <p className="text-luxe-bronze text-sm mb-2">{agent.title}</p>
                <p className="text-luxe-text-muted text-sm mb-6">{agent.sales}</p>
                <div className="flex space-x-3 justify-center">
                  <Button
                    size="sm"
                    className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light transition-colors text-xs px-4"
                    data-testid={`button-call-agent-${index}`}
                  >
                    <Phone className="h-3 w-3 mr-1.5" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-luxe-border text-luxe-text-muted hover:border-luxe-bronze hover:text-luxe-bronze transition-colors text-xs px-4"
                    data-testid={`button-email-agent-${index}`}
                  >
                    <Mail className="h-3 w-3 mr-1.5" />
                    Email
                  </Button>
                </div>
              </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LUXE CTA Section */}
      <section className="py-12 md:py-16 bg-luxe-bronze relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-luxe-bg mb-6 tracking-wide">Ready to Find Your Estate?</h2>
          <p className="text-lg text-luxe-bg/80 mb-10 max-w-2xl mx-auto">
            Discover your perfect luxury property with PrestigeEdge's personalized service
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={() => setConsultationOpen(true)}
              className="bg-luxe-bg text-luxe-bronze hover:bg-luxe-surface transition-colors px-8 py-3 text-sm font-medium"
              data-testid="button-consultation"
            >
              Book Consultation
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={scrollToProperties}
              className="text-luxe-bg hover:text-luxe-bg/80 transition-colors px-8 py-3 text-sm font-medium group"
              data-testid="button-explore-cta"
            >
              Explore Properties
              <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* LUXE Modal Styles */}
      <style>{`
        body .rdp:not([data-contained="true"]) {
          display: none !important;
        }
        body [class*="calendar"]:not([data-modal="true"]) {
          display: none !important;
        }
        
        /* LUXE Modal overlay */
        [data-radix-dialog-overlay] {
          background-color: rgba(10, 10, 10, 0.9) !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 50 !important;
        }
        
        [data-radix-dialog-content] {
          position: fixed !important;
          left: 50% !important;
          top: 50% !important;
          z-index: 51 !important;
          width: calc(100% - 2rem) !important;
          max-width: 32rem !important;
          transform: translate(-50%, -50%) !important;
          border-radius: 0 !important;
          border: 1px solid rgba(184, 134, 11, 0.3) !important;
          background: #111111 !important;
          padding: 1.5rem !important;
          color: #e8e4dc !important;
        }
        
        @media (max-width: 640px) {
          [data-radix-dialog-content] {
            width: calc(100% - 1rem) !important;
            margin: 0.5rem !important;
          }
        }
      `}</style>

      {/* LUXE Footer */}
      <footer id="contact-section" className="bg-luxe-bg text-luxe-text py-10 md:py-14 border-t border-luxe-border/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6">
                <span className="font-serif text-2xl tracking-wide text-luxe-text">
                  PRESTIGE<span className="text-luxe-bronze">EDGE</span>
                </span>
              </div>
              <p className="text-luxe-text-muted mb-8 max-w-md text-sm leading-relaxed">
                Refined real estate services for discerning clients. 
                Connecting you with exceptional properties since 1970.
              </p>
              <div className="flex space-x-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-xs"
                  data-testid="link-facebook"
                >
                  Facebook
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-xs"
                  data-testid="link-instagram"
                >
                  Instagram
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-xs"
                  data-testid="link-linkedin"
                >
                  LinkedIn
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-widest mb-6 text-luxe-bronze">Services</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="#" className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm">
                    Acquire Estates
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm">
                    Dispose Assets
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm">
                    Luxury Rentals
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-sm">
                    Estate Management
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-widest mb-6 text-luxe-bronze">Contact</h3>
              <ul className="space-y-3">
                <li className="flex items-center text-sm text-luxe-text-muted">
                  <Phone className="h-4 w-4 mr-2 text-luxe-bronze" />
                  +1 (555) PRESTIGE
                </li>
                <li className="flex items-center text-sm text-luxe-text-muted">
                  <Mail className="h-4 w-4 mr-2 text-luxe-bronze" />
                  elite@prestigeedge.com
                </li>
                <li className="flex items-start text-sm text-luxe-text-muted">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 text-luxe-bronze" />
                  <div>
                    One Luxury Plaza, Suite 5000
                    <br />
                    Beverly Hills, CA 90210
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="my-10 bg-luxe-border/30" />

          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-luxe-text-muted text-xs mb-4 md:mb-0">
              © 2024 PrestigeEdge. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="#" className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-xs">
                Privacy
              </Link>
              <Link href="#" className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-xs">
                Terms
              </Link>
              <Link href="#" className="text-luxe-text-muted hover:text-luxe-bronze transition-colors text-xs">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Virtual Tour Modal */}
      {selectedProperty && (
        <VirtualTour
          images={selectedProperty.virtualTourImages || []}
          propertyTitle={selectedProperty.title}
          isOpen={virtualTourOpen}
          onClose={() => {
            setVirtualTourOpen(false);
            setSelectedProperty(null);
          }}
        />
      )}

      {/* Advanced Search Modal */}
      <AdvancedSearch
        isOpen={advancedSearchOpen}
        onClose={() => setAdvancedSearchOpen(false)}
        onSearch={handleAdvancedSearch}
      />

      {/* Schedule Tour Dialog */}
      <Dialog open={scheduleTourOpen} onOpenChange={setScheduleTourOpen}>
        <DialogContent className="max-w-md bg-luxe-surface border border-luxe-border/40 text-luxe-text max-h-[90vh] overflow-hidden relative z-[100]">
          <DialogHeader className="pb-4">
            <DialogTitle className="font-serif text-xl font-normal text-luxe-text">Schedule Property Tour</DialogTitle>
            <DialogDescription className="text-luxe-text-muted text-sm">
              {selectedPropertyForTour ? 
                `Book a private tour of ${selectedPropertyForTour.title}` :
                'Book a time to view a property with an agent'
              }
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-200px)] overflow-y-auto pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleScheduleViewing)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Property</FormLabel>
                      <FormControl>
                        <Input 
                          value={selectedPropertyForTour?.title || ''}
                          disabled
                          className="bg-luxe-bg border-luxe-border/40 text-luxe-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Preferred Agent</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-luxe-bg border-luxe-border/40 text-luxe-text hover:border-luxe-bronze/40">
                            <SelectValue placeholder="Select an agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-luxe-surface border-luxe-border/40">
                          {agents.map((agent: any) => (
                            <SelectItem key={agent.id} value={agent.id} className="text-luxe-text hover:bg-luxe-bronze/20">
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="viewingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-luxe-text-muted text-sm">Date</FormLabel>
                      <FormControl>
                        <div className="w-full overflow-hidden relative z-10 max-w-full">
                          <div className="bg-luxe-bg border border-luxe-border/40 rounded-none p-2 max-w-full overflow-hidden">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              className="text-luxe-text w-full max-w-full [&>*]:max-w-full"
                              data-contained="true"
                              data-modal="true"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-luxe-bg border-luxe-border/40 text-luxe-text hover:border-luxe-bronze/40">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-luxe-surface border-luxe-border/40">
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time} className="text-luxe-text hover:bg-luxe-bronze/20">
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Special Requests (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements or questions..."
                          className="bg-luxe-bg border-luxe-border/40 text-luxe-text placeholder:text-luxe-text-muted/50 hover:border-luxe-bronze/40 focus:border-luxe-bronze"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScheduleTourOpen(false)}
                    className="border-luxe-border/40 text-luxe-text-muted hover:text-luxe-text"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={scheduleViewingMutation.isPending}
                    className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light"
                  >
                    {scheduleViewingMutation.isPending ? 'Scheduling...' : 'Schedule Tour'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Consultation Booking Dialog */}
      <Dialog open={consultationOpen} onOpenChange={setConsultationOpen}>
        <DialogContent className="sm:max-w-md bg-luxe-surface border border-luxe-border/40 text-luxe-text">
          <DialogHeader className="pb-4">
            <DialogTitle className="font-serif text-xl font-normal text-luxe-text">Schedule Private Consultation</DialogTitle>
            <DialogDescription className="text-luxe-text-muted text-sm">
              Book a private consultation with our real estate experts
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            <Form {...consultationForm}>
              <form onSubmit={consultationForm.handleSubmit(handleScheduleConsultation)} className="space-y-4">
                
                <FormField
                  control={consultationForm.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your full name"
                          className="bg-luxe-bg border-luxe-border/40 text-luxe-text placeholder:text-luxe-text-muted/50 hover:border-luxe-bronze/40 focus:border-luxe-bronze"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={consultationForm.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          className="bg-luxe-bg border-luxe-border/40 text-luxe-text placeholder:text-luxe-text-muted/50 hover:border-luxe-bronze/40 focus:border-luxe-bronze"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={consultationForm.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Enter your phone number"
                          className="bg-luxe-bg border-luxe-border/40 text-luxe-text placeholder:text-luxe-text-muted/50 hover:border-luxe-bronze/40 focus:border-luxe-bronze"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={consultationForm.control}
                  name="consultationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Consultation Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-luxe-bg border-luxe-border/40 text-luxe-text hover:border-luxe-bronze/40">
                            <SelectValue placeholder="Select consultation type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-luxe-surface border-luxe-border/40">
                          {CONSULTATION_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="text-luxe-text hover:bg-luxe-bronze/20">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={consultationForm.control}
                  name="agentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Preferred Agent</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-luxe-bg border-luxe-border/40 text-luxe-text hover:border-luxe-bronze/40">
                            <SelectValue placeholder="Select an agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-luxe-surface border-luxe-border/40">
                          {agents.map((agent: any) => (
                            <SelectItem key={agent.id} value={agent.id} className="text-luxe-text hover:bg-luxe-bronze/20">
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={consultationForm.control}
                  name="consultationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-luxe-text-muted text-sm">Date</FormLabel>
                      <FormControl>
                        <div className="w-full overflow-hidden relative z-10 max-w-full">
                          <div className="bg-luxe-bg border border-luxe-border/40 rounded-none p-2 max-w-full overflow-hidden">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              className="text-luxe-text w-full max-w-full [&>*]:max-w-full"
                              data-contained="true"
                              data-modal="true"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={consultationForm.control}
                  name="timeSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-luxe-bg border-luxe-border/40 text-luxe-text hover:border-luxe-bronze/40">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-luxe-surface border-luxe-border/40">
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time} className="text-luxe-text hover:bg-luxe-bronze/20">
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={consultationForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-luxe-text-muted text-sm">Special Requests (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any specific topics or questions for the consultation..."
                          className="bg-luxe-bg border-luxe-border/40 text-luxe-text placeholder:text-luxe-text-muted/50 hover:border-luxe-bronze/40 focus:border-luxe-bronze"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConsultationOpen(false)}
                    className="border-luxe-border/40 text-luxe-text-muted hover:text-luxe-text"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={scheduleConsultationMutation.isPending}
                    className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light"
                  >
                    {scheduleConsultationMutation.isPending ? 'Scheduling...' : 'Schedule Consultation'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chatbot */}
      <AIChatbot 
        isOpen={chatbotOpen} 
        onToggle={() => setChatbotOpen(!chatbotOpen)} 
      />
    </div>
  )
}
