import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, X, MapPin, Home, DollarSign, Calendar } from "lucide-react";

interface AdvancedSearchProps {
  onSearch: (filters: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchFilters {
  location: string;
  propertyType: string;
  minPrice: number;
  maxPrice: number;
  beds: number;
  baths: number;
  minSqft: number;
  maxSqft: number;
  features: string[];
  status: string;
  isFeatured: boolean;
  yearBuilt: { min: number; max: number };
}

const propertyTypes = [
  "All Types", "Mansion", "Penthouse", "Estate", "Villa", "Townhouse", "Condo", "Single Family"
];

const propertyFeatures = [
  "Ocean View", "Mountain View", "Pool", "Spa", "Tennis Court", "Wine Cellar", 
  "Home Theater", "Gourmet Kitchen", "Master Suite", "Guest House", "Garage",
  "Fireplace", "Balcony", "Garden", "Security System", "Smart Home", "Elevator"
];

const statusOptions = ["All Status", "Available", "Pending", "Sold"];

export function AdvancedSearch({ onSearch, isOpen, onClose }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    propertyType: "All Types",
    minPrice: 0,
    maxPrice: 50000000,
    beds: 0,
    baths: 0,
    minSqft: 0,
    maxSqft: 20000,
    features: [],
    status: "Available",
    isFeatured: false,
    yearBuilt: { min: 1900, max: new Date().getFullYear() }
  });

  // Get price range suggestions from API
  const { data: priceRanges } = useQuery({
    queryKey: ['/api/analytics/price-ranges'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleSearch = () => {
    // Convert filters to query parameters for the API (matching backend schema)
    const searchParams = {
      location: filters.location || undefined,
      propertyType: filters.propertyType !== "All Types" ? filters.propertyType : undefined,
      minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
      maxPrice: filters.maxPrice < 50000000 ? filters.maxPrice : undefined,
      beds: filters.beds > 0 ? filters.beds : undefined,
      baths: filters.baths > 0 ? filters.baths : undefined,
      minSqft: filters.minSqft > 0 ? filters.minSqft : undefined,
      maxSqft: filters.maxSqft < 20000 ? filters.maxSqft : undefined,
      status: filters.status !== "All Status" ? filters.status : undefined,
      featured: filters.isFeatured ? "true" : undefined,
      features: filters.features.length > 0 ? filters.features.join(",") : undefined,
    };
    
    // Remove undefined values
    const cleanParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, v]) => v !== undefined)
    );
    
    onSearch(cleanParams);
    onClose();
  };

  const clearFilters = () => {
    setFilters({
      location: "",
      propertyType: "All Types",
      minPrice: 0,
      maxPrice: 50000000,
      beds: 0,
      baths: 0,
      minSqft: 0,
      maxSqft: 20000,
      features: [],
      status: "Available",
      isFeatured: false,
      yearBuilt: { min: 1900, max: new Date().getFullYear() }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: price >= 1000000 ? 'compact' : 'standard'
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto bg-luxury-black-light border-luxury-gold/30 my-4 sm:my-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 sticky top-0 bg-luxury-black-light z-10">
          <CardTitle className="text-xl sm:text-2xl font-bold text-white flex items-center">
            <Filter className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-luxury-gold" />
            <span className="hidden sm:inline">Advanced Search</span>
            <span className="sm:hidden">Advanced</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-luxury-platinum hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Location & Property Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-luxury-gold font-semibold flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </Label>
              <Input
                placeholder="City, State, Zip Code"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="bg-luxury-black-medium border-luxury-gold/30 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-luxury-gold font-semibold flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Property Type
              </Label>
              <Select value={filters.propertyType} onValueChange={(value) => handleFilterChange('propertyType', value)}>
                <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-luxury-black-medium border-luxury-gold/30">
                  {propertyTypes.map(type => (
                    <SelectItem key={type} value={type} className="text-white hover:bg-luxury-gold/20">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-luxury-gold/20" />

          {/* Price Range */}
          <div className="space-y-4">
            <Label className="text-luxury-gold font-semibold flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Price Range
            </Label>
            
            <div className="space-y-4">
              <Slider
                value={[filters.minPrice, filters.maxPrice]}
                onValueChange={([min, max]) => {
                  handleFilterChange('minPrice', min);
                  handleFilterChange('maxPrice', max);
                }}
                max={50000000}
                min={0}
                step={250000}
                className="w-full"
              />
              <div className="flex justify-between text-sm">
                <span className="text-luxury-platinum">{formatPrice(filters.minPrice)}</span>
                <span className="text-luxury-platinum">{formatPrice(filters.maxPrice)}</span>
              </div>
            </div>

            {priceRanges && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">Quick Select:</Badge>
                {priceRanges.map((range: any) => (
                  <Button
                    key={range.label}
                    variant="outline"
                    size="sm"
                    className="text-xs border-luxury-gold/30 text-luxury-platinum hover:bg-luxury-gold/20"
                    onClick={() => {
                      handleFilterChange('minPrice', range.min);
                      handleFilterChange('maxPrice', range.max);
                    }}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-luxury-gold/20" />

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-luxury-gold font-semibold">Minimum Bedrooms</Label>
              <Select value={filters.beds.toString()} onValueChange={(value) => handleFilterChange('beds', parseInt(value))}>
                <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-luxury-black-medium border-luxury-gold/30">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <SelectItem key={num} value={num.toString()} className="text-white hover:bg-luxury-gold/20">
                      {num === 0 ? 'Any' : `${num}+ bed${num > 1 ? 's' : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-luxury-gold font-semibold">Minimum Bathrooms</Label>
              <Select value={filters.baths.toString()} onValueChange={(value) => handleFilterChange('baths', parseInt(value))}>
                <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-luxury-black-medium border-luxury-gold/30">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <SelectItem key={num} value={num.toString()} className="text-white hover:bg-luxury-gold/20">
                      {num === 0 ? 'Any' : `${num}+ bath${num > 1 ? 's' : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Square Footage */}
          <div className="space-y-4">
            <Label className="text-luxury-gold font-semibold">Square Footage</Label>
            <div className="space-y-4">
              <Slider
                value={[filters.minSqft, filters.maxSqft]}
                onValueChange={([min, max]) => {
                  handleFilterChange('minSqft', min);
                  handleFilterChange('maxSqft', max);
                }}
                max={20000}
                min={0}
                step={500}
                className="w-full"
              />
              <div className="flex justify-between text-sm">
                <span className="text-luxury-platinum">{filters.minSqft.toLocaleString()} sqft</span>
                <span className="text-luxury-platinum">{filters.maxSqft.toLocaleString()} sqft</span>
              </div>
            </div>
          </div>

          <Separator className="bg-luxury-gold/20" />

          {/* Property Features */}
          <div className="space-y-4">
            <Label className="text-luxury-gold font-semibold">Property Features</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {propertyFeatures.map(feature => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={feature}
                    checked={filters.features.includes(feature)}
                    onCheckedChange={() => handleFeatureToggle(feature)}
                    className="border-luxury-gold/30 data-[state=checked]:bg-luxury-gold data-[state=checked]:border-luxury-gold"
                  />
                  <Label htmlFor={feature} className="text-sm text-luxury-platinum cursor-pointer">
                    {feature}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-luxury-gold font-semibold">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="bg-luxury-black-medium border-luxury-gold/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-luxury-black-medium border-luxury-gold/30">
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status} className="text-white hover:bg-luxury-gold/20">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="featured"
                checked={filters.isFeatured}
                onCheckedChange={(checked) => handleFilterChange('isFeatured', checked)}
                className="border-luxury-gold/30 data-[state=checked]:bg-luxury-gold data-[state=checked]:border-luxury-gold"
              />
              <Label htmlFor="featured" className="text-luxury-platinum cursor-pointer">
                Featured properties only
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="border-luxury-gold/30 text-luxury-platinum hover:bg-luxury-gold/20"
            >
              Clear All Filters
            </Button>
            <div className="space-x-3">
              <Button variant="ghost" onClick={onClose} className="text-luxury-platinum hover:text-white">
                Cancel
              </Button>
              <Button onClick={handleSearch} className="bg-gold-gradient text-black hover:shadow-lg hover:shadow-luxury-gold/30">
                <Search className="h-4 w-4 mr-2" />
                Search Properties
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}