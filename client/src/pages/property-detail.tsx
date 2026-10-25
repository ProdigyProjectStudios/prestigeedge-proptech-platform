import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { VirtualTour } from "@/components/property/virtual-tour";
import { PropertyMap } from "@/components/property/property-map";
import { ImageGallery } from "@/components/property/image-gallery";
import { SEOHead } from "@/components/seo/seo-head";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Home,
  Heart,
  Share2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
  Maximize2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [isVirtualTourOpen, setIsVirtualTourOpen] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    message: ""
  });
  
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const imageRef = useRef<HTMLDivElement>(null);

  // Fetch property details with faster loading
  const { data: property, isLoading, error } = useQuery({
    queryKey: [`/api/properties/${id}`],
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 1, // Reduce retry attempts for faster failure
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Type guard for property
  const typedProperty = property as any;

  // Check if property is saved (only fetch when needed)
  const { data: savedProperties } = useQuery({
    queryKey: ['/api/saved-properties'],
    enabled: !!user && !!typedProperty,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const isSaved = Array.isArray(savedProperties) && savedProperties.some((p: any) => p.propertyId === typedProperty?.id);

  // Save property mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Must be logged in to save properties");
      }
      await apiRequest('POST', `/api/saved-properties/${typedProperty.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-properties'] });
      toast({
        title: "Success",
        description: "Property saved to your favorites",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save property. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove saved property mutation
  const removeSavedMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Must be logged in to remove saved properties");
      }
      await apiRequest('DELETE', `/api/saved-properties/${typedProperty.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-properties'] });
      toast({
        title: "Success",
        description: "Property removed from favorites",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove property. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit inquiry mutation
  const inquiryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/inquiries', {
        propertyId: typedProperty.id,
        clientId: user?.id,
        agentId: typedProperty.agentId,
        clientEmail: data.email,
        clientPhone: data.phone,
        message: data.message,
        name: data.name,
        status: 'open'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your inquiry has been sent. An agent will contact you soon.",
      });
      setIsInquiryOpen(false);
      setInquiryForm({
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
        message: ""
      });
    },
  });

  if (error || (!isLoading && !typedProperty)) {
    return (
      <div className="min-h-screen bg-luxe-bg flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-3">Not found</div>
          <h2 className="font-serif italic text-3xl text-luxe-text mb-6">Property not found</h2>
          <Link href="/">
            <Button className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light h-9 px-5 text-xs uppercase tracking-widest rounded-none font-medium">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !typedProperty) {
    return (
      <div className="min-h-screen bg-luxe-bg">
        <nav className="sticky top-0 w-full bg-luxe-bg/95 backdrop-blur-sm z-50 border-b border-luxe-border/30">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-12 md:h-14">
              <span className="font-serif text-lg md:text-xl tracking-wide text-luxe-text">
                PRESTIGE<span className="text-luxe-bronze">EDGE</span>
              </span>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-12">
          <div className="h-[420px] lg:h-[560px] bg-luxe-surface-light animate-pulse mb-10"></div>
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-5">
              <div className="h-10 bg-luxe-surface-light animate-pulse w-3/4"></div>
              <div className="h-4 bg-luxe-surface-light animate-pulse w-1/2"></div>
              <div className="h-7 bg-luxe-surface-light animate-pulse w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % typedProperty.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + typedProperty.images.length) % typedProperty.images.length);
  };

  // Touch handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!typedProperty || typedProperty.images.length <= 1) return;
    
    const difference = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(difference) > minSwipeDistance) {
      if (difference > 0) {
        nextImage(); // Swipe left -> next image
      } else {
        prevImage(); // Swipe right -> previous image
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Property link has been copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-luxe-bg">
      <SEOHead
        title={`${typedProperty?.title || 'Luxury Property'} - PrestigeEdge Real Estate`}
        description={`${typedProperty?.description || 'Luxury property for sale'} | ${typedProperty?.location || 'Premium location'} | $${typedProperty?.price?.toLocaleString() || 'Contact for price'}`}
        image={typedProperty?.images?.[0]}
        type="article"
      />
      {/* LUXE Sticky Navigation */}
      <nav className="sticky top-0 w-full bg-luxe-bg/95 backdrop-blur-sm z-50 border-b border-luxe-border/30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 md:h-14">
            <Link href="/" className="flex items-center">
              <span className="font-serif text-lg md:text-xl tracking-wide text-luxe-text">
                PRESTIGE<span className="text-luxe-bronze">EDGE</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center text-[11px] uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors duration-300"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
              Back to Properties
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-10 md:py-12">
        {/* Image Gallery Section */}
        <div className="mb-10">
          <div
            ref={imageRef}
            className="relative h-[420px] lg:h-[600px] overflow-hidden border border-luxe-border/40"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={typedProperty.images[currentImageIndex]}
              alt={typedProperty.title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setIsGalleryOpen(true)}
              loading="eager"
              decoding="async"
            />

            {/* Image Navigation - Hidden on mobile */}
            {typedProperty.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 hidden md:flex items-center justify-center transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 hidden md:flex items-center justify-center transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-4 bg-luxe-bg/80 backdrop-blur-sm text-luxe-text border border-luxe-border/40 px-3 py-1 text-[11px] uppercase tracking-widest">
              {currentImageIndex + 1} / {typedProperty.images.length}
            </div>

            {/* Mobile Swipe Hint */}
            {typedProperty.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-luxe-bg/80 backdrop-blur-sm text-luxe-text-muted border border-luxe-border/40 px-3 py-1 text-[10px] uppercase tracking-widest md:hidden">
                Swipe to navigate
              </div>
            )}

            {/* Image Dots Indicator */}
            {typedProperty.images.length > 1 && (
              <div className="absolute bottom-4 right-4 flex space-x-1.5">
                {typedProperty.images.map((_: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    aria-label={`Go to image ${index + 1}`}
                    className={`h-0.5 transition-all ${
                      index === currentImageIndex
                        ? 'w-6 bg-luxe-bronze'
                        : 'w-3 bg-luxe-text/40 hover:bg-luxe-text/70'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Expand Button */}
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              className="absolute top-4 right-4 w-10 h-10 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 flex items-center justify-center transition-colors"
              aria-label="Expand gallery"
            >
              <Maximize2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Enhanced Image Gallery */}
          <div className="mt-6">
            <ImageGallery
              images={typedProperty.images}
              title={typedProperty.title}
            />
          </div>
        </div>

        {/* Property Info Grid */}
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-10">
            {/* Title and Price */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-3">
                {typedProperty.propertyType === 'estate' ? 'Estate' :
                 typedProperty.propertyType === 'modern' ? 'Modern Residence' :
                 typedProperty.propertyType === 'villa' ? 'Villa' :
                 typedProperty.propertyType === 'victorian' ? 'Victorian' :
                 typedProperty.propertyType === 'penthouse' ? 'Penthouse' :
                 'Residence'}
              </div>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex-1">
                  <h1 className="font-serif italic text-3xl md:text-5xl text-luxe-text leading-tight mb-3">
                    {typedProperty.title}
                  </h1>
                  <div className="flex items-center text-luxe-text-muted text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-luxe-bronze" strokeWidth={1.5} />
                    <span>{typedProperty.address}</span>
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-widest border px-2.5 py-1 whitespace-nowrap ${
                  typedProperty.status === 'available'
                    ? 'text-emerald-400/90 border-emerald-400/30'
                    : typedProperty.status === 'pending'
                    ? 'text-luxe-bronze border-luxe-bronze/40'
                    : 'text-rose-400/90 border-rose-400/30'
                }`}>
                  {typedProperty.status}
                </span>
              </div>
              <div className="pt-5 border-t border-luxe-border/30">
                <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-2">Asking</div>
                <div className="font-serif text-4xl md:text-5xl text-luxe-bronze">
                  ${typedProperty.price.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-luxe-border/30 border border-luxe-border/30">
              <div className="bg-luxe-bg p-5 md:p-6">
                <Bed className="h-4 w-4 text-luxe-bronze mb-3" strokeWidth={1.5} />
                <div className="font-serif text-2xl md:text-3xl text-luxe-text">{typedProperty.beds}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mt-1">Bedrooms</div>
              </div>
              <div className="bg-luxe-bg p-5 md:p-6">
                <Bath className="h-4 w-4 text-luxe-bronze mb-3" strokeWidth={1.5} />
                <div className="font-serif text-2xl md:text-3xl text-luxe-text">{typedProperty.baths}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mt-1">Bathrooms</div>
              </div>
              <div className="bg-luxe-bg p-5 md:p-6">
                <Square className="h-4 w-4 text-luxe-bronze mb-3" strokeWidth={1.5} />
                <div className="font-serif text-2xl md:text-3xl text-luxe-text">{typedProperty.sqft.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mt-1">Sq Ft</div>
              </div>
              <div className="bg-luxe-bg p-5 md:p-6">
                <Home className="h-4 w-4 text-luxe-bronze mb-3" strokeWidth={1.5} />
                <div className="font-serif text-base md:text-lg text-luxe-text leading-tight">
                  {typedProperty.propertyType === 'estate' ? 'Estate' :
                   typedProperty.propertyType === 'modern' ? 'Modern' :
                   typedProperty.propertyType === 'villa' ? 'Villa' :
                   typedProperty.propertyType === 'victorian' ? 'Victorian' :
                   typedProperty.propertyType === 'penthouse' ? 'Penthouse' :
                   'Modern'}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-luxe-text-muted mt-1">Type</div>
              </div>
            </div>

            {/* Description and Features */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-luxe-border/30 rounded-none h-auto p-0 gap-0">
                <TabsTrigger
                  value="description"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="features"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-luxe-bronze data-[state=active]:bg-transparent data-[state=active]:text-luxe-bronze text-luxe-text-muted hover:text-luxe-text px-5 py-3 text-xs uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  Features &amp; Amenities
                </TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="mt-8">
                <p className="text-luxe-text-muted leading-relaxed whitespace-pre-wrap">{typedProperty.description}</p>
              </TabsContent>
              <TabsContent value="features" className="mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {typedProperty.features?.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center text-sm text-luxe-text-muted py-2 border-b border-luxe-border/20">
                      <div className="w-1 h-1 bg-luxe-bronze mr-3"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Location Map */}
            <div className="pt-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-3">Location</div>
              <h3 className="font-serif italic text-3xl text-luxe-text mb-6">On the Map</h3>
              <PropertyMap
                address={typedProperty.address}
                title={typedProperty.title}
                price={typedProperty.price}
                property={{ latitude: typedProperty.latitude, longitude: typedProperty.longitude }}
                className="w-full"
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Action Buttons */}
            <div className="bg-luxe-surface border border-luxe-border/50 rounded-none p-6 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-2">Inquire</div>
              <Button
                className="w-full bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light h-10 text-xs uppercase tracking-widest rounded-none font-medium"
                onClick={() => setIsInquiryOpen(true)}
              >
                <Mail className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Send Inquiry
              </Button>

              <Button
                variant="outline"
                className="w-full border-luxe-border/60 text-luxe-text hover:bg-luxe-surface-light hover:text-luxe-bronze hover:border-luxe-bronze/50 h-10 text-xs uppercase tracking-widest rounded-none bg-transparent"
                onClick={() => setIsVirtualTourOpen(true)}
              >
                <Play className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Virtual Tour
              </Button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  className="border-luxe-border/60 text-luxe-text hover:bg-luxe-surface-light hover:text-luxe-bronze hover:border-luxe-bronze/50 h-10 text-xs uppercase tracking-widest rounded-none bg-transparent"
                  onClick={() => {
                    if (!user) {
                      toast({
                        title: "Please login",
                        description: "You need to be logged in to save properties",
                        variant: "destructive",
                      });
                      return;
                    }
                    isSaved ? removeSavedMutation.mutate() : saveMutation.mutate();
                  }}
                  disabled={saveMutation.isPending || removeSavedMutation.isPending}
                >
                  <Heart className={`h-3.5 w-3.5 mr-2 ${isSaved ? 'fill-current text-luxe-bronze' : ''}`} strokeWidth={1.5} />
                  {saveMutation.isPending || removeSavedMutation.isPending
                    ? '...'
                    : isSaved ? 'Saved' : 'Save'
                  }
                </Button>
                <Button
                  variant="outline"
                  className="border-luxe-border/60 text-luxe-text hover:bg-luxe-surface-light hover:text-luxe-bronze hover:border-luxe-bronze/50 h-10 text-xs uppercase tracking-widest rounded-none bg-transparent"
                  onClick={handleShare}
                >
                  <Share2 className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                  Share
                </Button>
              </div>
            </div>

            {/* Agent Contact */}
            <div className="bg-luxe-surface border border-luxe-border/50 rounded-none p-6">
              <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-2">Concierge</div>
              <h3 className="font-serif italic text-2xl text-luxe-text mb-5">Contact Agent</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-luxe-text-muted py-2.5 border-b border-luxe-border/20">
                  <Phone className="h-3.5 w-3.5 mr-3 text-luxe-bronze" strokeWidth={1.5} />
                  <span className="tracking-wide">(555) 123-4567</span>
                </div>
                <div className="flex items-center text-sm text-luxe-text-muted py-2.5">
                  <Mail className="h-3.5 w-3.5 mr-3 text-luxe-bronze" strokeWidth={1.5} />
                  <span className="tracking-wide">agent@prestigeedge.com</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Full Screen Gallery Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-7xl h-[90vh] bg-luxe-bg border border-luxe-border/40 rounded-none sm:rounded-none p-0 [&>button]:hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={typedProperty.images[currentImageIndex]}
              alt={typedProperty.title}
              className="max-w-full max-h-full object-contain"
            />

            <button
              type="button"
              onClick={() => setIsGalleryOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 flex items-center justify-center transition-colors"
              aria-label="Close gallery"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>

            {typedProperty.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 hidden md:flex items-center justify-center transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 hidden md:flex items-center justify-center transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-luxe-bg/80 backdrop-blur-sm text-luxe-text border border-luxe-border/40 px-4 py-1.5 text-[11px] uppercase tracking-widest">
              {currentImageIndex + 1} / {typedProperty.images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inquiry Modal */}
      <Dialog open={isInquiryOpen} onOpenChange={setIsInquiryOpen}>
        <DialogContent className="bg-luxe-surface border border-luxe-border/50 rounded-none sm:rounded-none max-w-md">
          <DialogHeader>
            <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-2">Concierge</div>
            <DialogTitle className="font-serif italic text-2xl text-luxe-text">Send Inquiry</DialogTitle>
            <DialogDescription className="text-luxe-text-muted text-sm pt-1">
              Interested in {typedProperty.title}? Send us a message and we'll get back to you soon.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            inquiryMutation.mutate(inquiryForm);
          }} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-luxe-text-muted">Name</Label>
              <Input
                id="name"
                value={inquiryForm.name}
                onChange={(e) => setInquiryForm({...inquiryForm, name: e.target.value})}
                className="bg-luxe-bg border border-luxe-border/50 text-luxe-text rounded-none h-10 focus-visible:ring-0 focus-visible:border-luxe-bronze/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-luxe-text-muted">Email</Label>
              <Input
                id="email"
                type="email"
                value={inquiryForm.email}
                onChange={(e) => setInquiryForm({...inquiryForm, email: e.target.value})}
                className="bg-luxe-bg border border-luxe-border/50 text-luxe-text rounded-none h-10 focus-visible:ring-0 focus-visible:border-luxe-bronze/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[10px] uppercase tracking-widest text-luxe-text-muted">Phone</Label>
              <Input
                id="phone"
                value={inquiryForm.phone}
                onChange={(e) => setInquiryForm({...inquiryForm, phone: e.target.value})}
                className="bg-luxe-bg border border-luxe-border/50 text-luxe-text rounded-none h-10 focus-visible:ring-0 focus-visible:border-luxe-bronze/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message" className="text-[10px] uppercase tracking-widest text-luxe-text-muted">Message</Label>
              <Textarea
                id="message"
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                className="bg-luxe-bg border border-luxe-border/50 text-luxe-text rounded-none min-h-[100px] focus-visible:ring-0 focus-visible:border-luxe-bronze/50"
                placeholder="I'm interested in this property..."
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light h-10 text-xs uppercase tracking-widest rounded-none font-medium mt-2"
              disabled={inquiryMutation.isPending}
            >
              {inquiryMutation.isPending ? 'Sending...' : 'Send Inquiry'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Virtual Tour Modal */}
      {property && (
        <VirtualTour
          images={typedProperty.virtualTourImages || typedProperty.images}
          propertyTitle={typedProperty.title}
          isOpen={isVirtualTourOpen}
          onClose={() => setIsVirtualTourOpen(false)}
        />
      )}
    </div>
  );
}