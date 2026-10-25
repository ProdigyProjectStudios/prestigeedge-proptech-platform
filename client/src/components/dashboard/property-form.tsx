"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  Home, 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Square,
  Crown,
  Building,
  Plus,
  Camera
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { insertPropertySchema } from "@shared/schema";
import type { InsertProperty, Property } from "@shared/schema";
import { AIDescriptionGenerator } from "@/components/ai/ai-description-generator";

interface PropertyFormProps {
  property?: Property;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PropertyForm({ property, onSuccess, onCancel }: PropertyFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(property?.images || []);
  const [selectedVirtualTourImages, setSelectedVirtualTourImages] = useState<File[]>([]);
  const [virtualTourPreviewUrls, setVirtualTourPreviewUrls] = useState<string[]>(property?.virtualTourImages || []);

  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema.omit({ agentId: true })),
    defaultValues: {
      title: property?.title || "",
      description: property?.description || "",
      price: property?.price || 0,
      location: property?.location || "",
      address: property?.address || "",
      beds: property?.beds || 1,
      baths: property?.baths || 1,
      sqft: property?.sqft || 1000,
      propertyType: property?.propertyType || "mansion",
      features: property?.features || [],
      status: property?.status || "available",
      isFeatured: property?.isFeatured || false,
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: InsertProperty & { images?: File[]; virtualTourImages?: File[] }) => {
      const formData = new FormData();
      
      // Append property data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "images" && key !== "virtualTourImages" && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(key, item));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Append regular images
      if (data.images) {
        data.images.forEach((file) => {
          formData.append("images", file);
        });
      }

      // Append virtual tour images
      if (data.virtualTourImages) {
        data.virtualTourImages.forEach((file) => {
          formData.append("virtualTourImages", file);
        });
      }

      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create property");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property created successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async (data: Partial<InsertProperty> & { images?: File[]; virtualTourImages?: File[] }) => {
      const formData = new FormData();
      
      // Append property data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "images" && key !== "virtualTourImages" && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(key, item));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Append new images
      if (data.images) {
        data.images.forEach((file) => {
          formData.append("images", file);
        });
      }

      // Append new virtual tour images
      if (data.virtualTourImages) {
        data.virtualTourImages.forEach((file) => {
          formData.append("virtualTourImages", file);
        });
      }

      const response = await fetch(`/api/properties/${property!.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update property");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProperty) => {
    const payload = {
      ...data,
      images: selectedImages,
      virtualTourImages: selectedVirtualTourImages,
    };

    if (property) {
      updatePropertyMutation.mutate(payload);
    } else {
      createPropertyMutation.mutate(payload);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);

    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviewUrls(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    // Remove from selected images if it's a new image
    if (index >= (property?.images?.length || 0)) {
      const newImageIndex = index - (property?.images?.length || 0);
      setSelectedImages(prev => prev.filter((_, i) => i !== newImageIndex));
    }
    
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleVirtualTourImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedVirtualTourImages(prev => [...prev, ...files]);

    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setVirtualTourPreviewUrls(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeVirtualTourImage = (index: number) => {
    // Remove from selected images if it's a new image
    if (index >= (property?.virtualTourImages?.length || 0)) {
      const newImageIndex = index - (property?.virtualTourImages?.length || 0);
      setSelectedVirtualTourImages(prev => prev.filter((_, i) => i !== newImageIndex));
    }
    
    setVirtualTourPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const addFeature = () => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", [...currentFeatures, ""]);
  };

  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", currentFeatures.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, value: string) => {
    const currentFeatures = form.getValues("features") || [];
    const updatedFeatures = [...currentFeatures];
    updatedFeatures[index] = value;
    form.setValue("features", updatedFeatures);
  };

  return (
    <Card className="luxury-glass border-luxury-gold/20 luxury-box-shadow">
      <CardHeader>
        <CardTitle className="text-2xl text-white flex items-center">
          <Building className="h-6 w-6 text-luxury-gold mr-3" />
          {property ? "Edit Property" : "Add New Property"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Property Title</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 h-4 w-4 text-luxury-gold" />
                        <Input
                          {...field}
                          placeholder="Luxury Mansion in Beverly Hills"
                          className="pl-10 bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Price (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-luxury-gold" />
                        <Input
                          {...field}
                          type="number"
                          placeholder="5000000"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="pl-10 bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Location</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-luxury-gold" />
                        <Input
                          {...field}
                          placeholder="Beverly Hills, CA"
                          className="pl-10 bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Property Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-luxury-black-light border-luxury-gold/30 text-white focus:border-luxury-gold focus:ring-luxury-gold/20">
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent className="bg-luxury-black-light border-luxury-gold/30">
                          <SelectItem value="mansion" className="text-white hover:bg-luxury-gold/20">Mansion</SelectItem>
                          <SelectItem value="penthouse" className="text-white hover:bg-luxury-gold/20">Penthouse</SelectItem>
                          <SelectItem value="estate" className="text-white hover:bg-luxury-gold/20">Estate</SelectItem>
                          <SelectItem value="villa" className="text-white hover:bg-luxury-gold/20">Villa</SelectItem>
                          <SelectItem value="townhouse" className="text-white hover:bg-luxury-gold/20">Townhouse</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-luxury-gold font-semibold">Full Address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123 Luxury Lane, Beverly Hills, CA 90210"
                      className="bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe this magnificent property..."
                        rows={6}
                        className="bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <AIDescriptionGenerator
                property={{
                  title: form.watch("title"),
                  location: form.watch("location"), 
                  price: form.watch("price"),
                  beds: form.watch("beds"),
                  baths: form.watch("baths"),
                  sqft: form.watch("sqft"),
                  propertyType: form.watch("propertyType"),
                  features: form.watch("features")
                }}
                onDescriptionGenerated={(description) => {
                  form.setValue("description", description);
                }}
                className="h-fit"
              />
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="beds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Bedrooms</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Bed className="absolute left-3 top-3 h-4 w-4 text-luxury-gold" />
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="pl-10 bg-luxury-black-light border-luxury-gold/30 text-white focus:border-luxury-gold focus:ring-luxury-gold/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Bathrooms</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Bath className="absolute left-3 top-3 h-4 w-4 text-luxury-gold" />
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="pl-10 bg-luxury-black-light border-luxury-gold/30 text-white focus:border-luxury-gold focus:ring-luxury-gold/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sqft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Square Feet</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Square className="absolute left-3 top-3 h-4 w-4 text-luxury-gold" />
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="pl-10 bg-luxury-black-light border-luxury-gold/30 text-white focus:border-luxury-gold focus:ring-luxury-gold/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-luxury-gold font-semibold">Property Features</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFeature}
                  className="border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black bg-transparent"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Feature
                </Button>
              </div>

              <div className="space-y-2">
                {(form.watch("features") || []).map((_, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder="e.g., Swimming Pool, Wine Cellar"
                      value={form.watch("features")?.[index] || ""}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      className="bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum/60 focus:border-luxury-gold focus:ring-luxury-gold/20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFeature(index)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white bg-transparent p-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Property Status and Featured */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-luxury-gold font-semibold">Status</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-luxury-black-light border-luxury-gold/30 text-white focus:border-luxury-gold focus:ring-luxury-gold/20">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-luxury-black-light border-luxury-gold/30">
                          <SelectItem value="available" className="text-white hover:bg-luxury-gold/20">Available</SelectItem>
                          <SelectItem value="pending" className="text-white hover:bg-luxury-gold/20">Pending</SelectItem>
                          <SelectItem value="sold" className="text-white hover:bg-luxury-gold/20">Sold</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-luxury-gold data-[state=checked]:bg-luxury-gold data-[state=checked]:text-black"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-luxury-gold font-semibold flex items-center">
                        <Crown className="h-4 w-4 mr-2" />
                        Featured Property
                      </FormLabel>
                      <p className="text-sm text-luxury-platinum">
                        Mark as featured to highlight this property
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-4">
              <FormLabel className="text-luxury-gold font-semibold">Property Images</FormLabel>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Property ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-luxury-gold/20"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <label className="w-full h-32 border-2 border-dashed border-luxury-gold/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-luxury-gold/60 transition-colors group">
                  <Upload className="h-8 w-8 text-luxury-gold group-hover:text-luxury-gold-light mb-2" />
                  <span className="text-sm text-luxury-platinum group-hover:text-white">Add Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Virtual Tour Images Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-luxury-gold" />
                <FormLabel className="text-luxury-gold font-semibold">Virtual Tour 360° Images</FormLabel>
              </div>
              <p className="text-sm text-luxury-platinum mb-4">
                Upload 360° panoramic images for immersive virtual tours. For best results, use equirectangular 360° photos.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {virtualTourPreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Virtual Tour ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-luxury-gold/20"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Camera className="h-6 w-6 text-luxury-gold" />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeVirtualTourImage(index)}
                      className="absolute top-2 right-2 p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <label className="w-full h-32 border-2 border-dashed border-luxury-gold/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-luxury-gold/60 transition-colors group">
                  <Camera className="h-8 w-8 text-luxury-gold group-hover:text-luxury-gold-light mb-2" />
                  <span className="text-sm text-luxury-platinum group-hover:text-white">Add 360° Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleVirtualTourImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-luxury-gold/20">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black bg-transparent"
                >
                  Cancel
                </Button>
              )}
              
              <Button
                type="submit"
                disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}
                className="bg-gold-gradient text-black hover:shadow-lg hover:shadow-luxury-gold/30 transition-all duration-300 font-bold luxury-glow"
              >
                {createPropertyMutation.isPending || updatePropertyMutation.isPending
                  ? (property ? "Updating..." : "Creating...")
                  : (property ? "Update Property" : "Create Property")
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
