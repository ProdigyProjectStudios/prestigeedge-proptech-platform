"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Edit, 
  Trash2, 
  Crown,
  Heart,
  Play,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter
} from "lucide-react";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { PropertyImage } from "@/components/ui/property-image"
import { LazyImage } from "@/components/ui/lazy-image"
import { PropertyGridSkeleton } from "@/components/ui/skeleton-loader"
import { AdvancedSearch } from "@/components/search/advanced-search";
import { VirtualTour } from "@/components/property/virtual-tour";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Property, PropertySearchParams } from "@shared/schema";


interface PropertyGridProps {
  showActions?: boolean;
  onEdit?: (property: Property) => void;
  savedOnly?: boolean;
  limit?: number;
}

export function PropertyGrid({ showActions = false, onEdit, savedOnly = false, limit }: PropertyGridProps) {
  const { user } = useAuth();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [virtualTourOpen, setVirtualTourOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const [searchParams, setSearchParams] = useState<PropertySearchParams>({
    page: 1,
    limit: limit || 9, // Better grid layout with 3x3
    location: "",
    minPrice: undefined,
    maxPrice: undefined,
    beds: undefined,
    baths: undefined,
    propertyType: "",
  });

  // Fetch saved properties to track which ones are saved
  const { data: savedProperties = [], isLoading: savedPropertiesLoading } = useQuery({
    queryKey: ["/api/saved-properties"],
    queryFn: async () => {
      const res = await fetch("/api/saved-properties", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: user?.role === "client",
  });

  const savedPropertyIds = savedProperties.map((p: Property) => p.id);

  // Local state for optimistic updates
  const [optimisticallyLiked, setOptimisticallyLiked] = useState<Set<string>>(new Set());

  const { data: propertiesData, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties", searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
      
      console.log("[PropertyGrid] Search params:", searchParams);
      console.log("[PropertyGrid] URL params:", params.toString());
      
      const res = await fetch(`/api/properties?${params}`);
      if (!res.ok) throw new Error("Failed to fetch properties");
      const result = await res.json();
      console.log("[PropertyGrid] API result:", { total: result.total, count: result.properties?.length });
      return result;
    },
    enabled: !savedOnly,
  });

  // For saved properties, we use the savedProperties data directly
  const displayData = savedOnly 
    ? { properties: savedProperties, total: savedProperties.length, totalPages: 1, currentPage: 1 }
    : propertiesData;



  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      await apiRequest("DELETE", `/api/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    },
  });

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
        description: "Property saved successfully",
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
        description: "Property removed from saved list",
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSearch = (updates: Partial<PropertySearchParams>) => {
    setSearchParams(prev => ({ ...prev, ...updates, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }));
    
    // Auto-scroll to the top of the properties section
    setTimeout(() => {
      const propertiesSection = document.querySelector('[data-properties-section]');
      if (propertiesSection) {
        propertiesSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const properties = displayData?.properties || [];
  const totalPages = displayData?.totalPages || 1;
  const currentPage = displayData?.currentPage || 1;
  
  // Determine the loading state based on which data we're using
  const isLoading = savedOnly ? savedPropertiesLoading : propertiesLoading;

  return (
    <div className="space-y-8" data-properties-section>
      {/* Search Filters */}
      {!savedOnly && (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="w-full">
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between bg-luxury-black-light border-luxury-gold/30 text-white hover:bg-luxury-gold/10 hover:border-luxury-gold/50 luxury-box-shadow"
            >
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-luxury-gold" />
                <span className="font-semibold text-luxury-gold uppercase tracking-wider">Advanced Search</span>
              </div>
              {filtersOpen ? (
                <ChevronUp className="h-4 w-4 text-luxury-gold" />
              ) : (
                <ChevronDown className="h-4 w-4 text-luxury-gold" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4">
            <div className="luxury-glass rounded-2xl p-6 luxury-box-shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-luxury-gold uppercase tracking-wider">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-luxury-gold" />
                    <Input
                      placeholder="City, neighborhood..."
                      value={searchParams.location}
                      onChange={(e) => handleSearch({ location: e.target.value })}
                      className="pl-10 bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-luxury-gold uppercase tracking-wider">Property Type</label>
                  <Select value={searchParams.propertyType || "all"} onValueChange={(value) => handleSearch({ propertyType: value === "all" ? "" : value })}>
                    <SelectTrigger className="bg-luxury-black-light border-luxury-gold/30 text-white focus:border-luxury-gold focus:ring-luxury-gold/20">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-luxury-black-light border-luxury-gold/30">
                      <SelectItem value="all" className="text-white hover:bg-luxury-gold/20">All Types</SelectItem>
                      <SelectItem value="mansion" className="text-white hover:bg-luxury-gold/20">Mansion</SelectItem>
                      <SelectItem value="penthouse" className="text-white hover:bg-luxury-gold/20">Penthouse</SelectItem>
                      <SelectItem value="estate" className="text-white hover:bg-luxury-gold/20">Estate</SelectItem>
                      <SelectItem value="villa" className="text-white hover:bg-luxury-gold/20">Villa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-luxury-gold uppercase tracking-wider">Min Price</label>
                  <Input
                    type="number"
                    placeholder="Minimum price"
                    value={searchParams.minPrice || ""}
                    onChange={(e) => handleSearch({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-luxury-gold uppercase tracking-wider">Max Price</label>
                  <Input
                    type="number"
                    placeholder="Maximum price"
                    value={searchParams.maxPrice || ""}
                    onChange={(e) => handleSearch({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="overflow-hidden bg-luxury-black-light border-luxury-gold/20 luxury-box-shadow animate-pulse">
                <div className="h-48 bg-luxury-black-medium" />
                <CardContent className="p-4">
                  <div className="h-4 bg-luxury-black-medium rounded mb-2" />
                  <div className="h-6 bg-luxury-black-medium rounded mb-4" />
                  <div className="flex justify-between">
                    <div className="h-4 bg-luxury-black-medium rounded w-16" />
                    <div className="h-4 bg-luxury-black-medium rounded w-16" />
                    <div className="h-4 bg-luxury-black-medium rounded w-16" />
                  </div>
                </CardContent>
              </Card>
            ))
          : properties.map((property: Property) => (
              <Card
                key={property.id}
                className={`group overflow-hidden bg-gray-800 border-luxury-gold/30 luxury-box-shadow hover:border-luxury-gold/60 ${
                  showActions ? 'cursor-default' : 'cursor-pointer'
                }`}
                onClick={showActions ? undefined : () => window.location.href = `/property/${property.id}`}
              >
                <div className="relative overflow-hidden">
                  <LazyImage
                    src={property.images[0] || "/placeholder.svg?height=400&width=600"}
                    alt={property.title}
                    className="w-full h-48 object-cover"
                    priority={false}
                  />
                  
                  {property.isFeatured && (
                    <Badge className="absolute top-3 left-3 bg-gold-gradient text-black font-bold px-2 py-1 text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      FEATURED
                    </Badge>
                  )}

                  {/* Virtual Tour button at top right */}
                  <div className="absolute top-3 right-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-black/80 text-luxury-gold hover:bg-luxury-gold hover:text-black opacity-0 group-hover:opacity-100 transition-all duration-300 p-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedProperty(property);
                        setVirtualTourOpen(true);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Heart icon at bottom right of image - hide for admin users */}
                  {user && user.role !== 'admin' && (
                    <div className="absolute bottom-2 right-2 z-20">
                      <button
                        className="property-heart-button p-1.5 flex items-center justify-center bg-black/10 backdrop-blur-sm hover:bg-black/30 touch-manipulation rounded-full transition-all duration-150"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (savedOnly) {
                            unsavePropertyMutation.mutate(property.id);
                          } else if (savedPropertyIds.includes(property.id)) {
                            unsavePropertyMutation.mutate(property.id);
                          } else {
                            savePropertyMutation.mutate(property.id);
                          }
                        }}
                        disabled={savePropertyMutation.isPending || unsavePropertyMutation.isPending}
                      >
                        <Heart 
                          className={`property-heart-icon h-3 w-3 transition-all duration-75 ${
                            savedOnly || savedPropertyIds.includes(property.id) || optimisticallyLiked.has(property.id)
                              ? 'fill-red-500 text-red-500' 
                              : 'text-white/80 hover:text-white'
                          }`} 
                        />
                      </button>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </div>

                <CardContent className="p-4 relative bg-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <h3 
                      className={`text-lg font-bold text-gray-100 group-hover:text-luxury-gold transition-colors duration-300 line-clamp-1 ${
                        showActions ? 'cursor-default' : 'cursor-pointer'
                      }`}
                      onClick={showActions ? undefined : () => window.location.href = `/property/${property.id}`}
                    >
                      {property.title}
                    </h3>
                    <div className="text-xl font-bold text-luxury-gold">
                      {formatPrice(property.price)}
                    </div>
                  </div>

                  <div className="flex items-center text-gray-300 mb-3 text-sm">
                    <MapPin className="h-4 w-4 mr-1 text-luxury-gold" />
                    <span className="line-clamp-1">{property.location}</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-300 text-sm mb-4">
                    <div className="flex items-center">
                      <Bed className="h-4 w-4 mr-1 text-luxury-gold" />
                      <span>{property.beds} beds</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="h-4 w-4 mr-1 text-luxury-gold" />
                      <span>{property.baths} baths</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="h-4 w-4 mr-1 text-luxury-gold" />
                      <span>{property.sqft.toLocaleString()} sqft</span>
                    </div>
                  </div>

                  {showActions && (user?.role === "admin" || user?.id === property.agentId) && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(property);
                        }}
                        className="flex-1 border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black bg-transparent"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePropertyMutation.mutate(property.id);
                        }}
                        disabled={deletePropertyMutation.isPending}
                        className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}


                </CardContent>
              </Card>
            ))}
      </div>

      {/* Luxury Pagination - Matching Main Page Style */}
      {!savedOnly && totalPages > 1 && (
        <div className="flex items-center justify-center mt-12 space-x-2 md:space-x-3">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            className="border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black transition-all duration-300 bg-transparent px-3 md:px-6 py-2 md:py-3 font-semibold text-sm md:text-base"
          >
            <ChevronLeft className="h-4 md:h-5 w-4 md:w-5 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          <div className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => handlePageChange(page)}
                disabled={isLoading}
                className={
                  currentPage === page
                    ? "bg-gold-gradient text-black hover:shadow-lg hover:shadow-luxury-gold/30 font-bold px-3 md:px-4 py-2 md:py-3 text-sm md:text-base"
                    : "border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black transition-all duration-300 bg-transparent px-3 md:px-4 py-2 md:py-3 font-semibold text-sm md:text-base"
                }
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            className="border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black transition-all duration-300 bg-transparent px-3 md:px-6 py-2 md:py-3 font-semibold text-sm md:text-base"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 md:h-5 w-4 md:w-5 ml-1 md:ml-2" />
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && properties.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-luxury-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-12 w-12 text-luxury-gold" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Properties Found</h3>
          <p className="text-luxury-platinum">
            {savedOnly 
              ? "You haven't saved any properties yet. Browse our collection to save your favorites."
              : "Try adjusting your search criteria to find the perfect luxury property."
            }
          </p>
        </div>
      )}

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
    </div>
  );
}
