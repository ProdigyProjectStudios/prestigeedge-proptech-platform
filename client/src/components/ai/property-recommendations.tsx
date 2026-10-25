import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Bed, Bath, Square, TrendingUp, Heart } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface Recommendation {
  propertyId: string;
  matchScore: number;
  reason: string;
  property: any;
}

interface PropertyRecommendationsProps {
  userPreferences?: any;
  className?: string;
}

export function PropertyRecommendations({ userPreferences, className }: PropertyRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available properties
  const { data: properties } = useQuery({
    queryKey: ['/api/properties'],
  });

  const propertiesData = properties as { properties: any[] } | undefined;

  const generateRecommendations = async () => {
    if (!propertiesData?.properties?.length) return;

    setIsLoading(true);
    try {
      // Show immediate loading feedback
      setRecommendations([]);
      
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: userPreferences || {
            maxPrice: 20000000,
            propertyType: 'mansion',
            location: 'Beverly Hills',
            lifestyle: 'luxury living'
          },
          properties: propertiesData.properties.slice(0, 8) // Limit for faster processing
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Match recommendations with property details
      const enrichedRecommendations = data.recommendations.map((rec: any) => ({
        ...rec,
        property: propertiesData?.properties.find((p: any) => p.id === rec.propertyId)
      })).filter((rec: any) => rec.property);

      setRecommendations(enrichedRecommendations);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (propertiesData?.properties?.length) {
      generateRecommendations();
    }
  }, [propertiesData]);

  if (isLoading) {
    return (
      <Card className={`bg-luxury-black-medium border-luxury-gold/30 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-luxury-gold">
            <Sparkles className="h-5 w-5" />
            AI-Powered Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
              <p className="text-luxury-platinum">Analyzing your preferences...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-luxury-black-medium border-luxury-gold/30 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-luxury-gold">
          <Sparkles className="h-5 w-5" />
          AI-Powered Recommendations
        </CardTitle>
        <p className="text-sm text-luxury-platinum">
          Curated selections based on your preferences and lifestyle
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {recommendations.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-luxury-platinum mb-4">No recommendations available</p>
            <Button 
              onClick={generateRecommendations}
              className="bg-luxury-gold text-black hover:bg-luxury-gold/90"
            >
              Generate Recommendations
            </Button>
          </div>
        ) : (
          recommendations.map((rec, index) => (
            <div key={rec.propertyId} className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-luxury-gold/20 text-luxury-gold border-luxury-gold/50">
                  #{index + 1} Match
                </Badge>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">
                    {rec.matchScore}% Match
                  </span>
                </div>
              </div>

              <Card className="bg-luxury-black-light border-luxury-gold/20 hover:border-luxury-gold/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {rec.property.images?.[0] && (
                      <img
                        src={rec.property.images[0]}
                        alt={rec.property.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <div>
                        <h3 className="font-semibold text-white">{rec.property.title}</h3>
                        <div className="flex items-center gap-1 text-luxury-platinum text-sm">
                          <MapPin className="h-3 w-3" />
                          {rec.property.location}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-luxury-platinum">
                        <div className="flex items-center gap-1">
                          <Bed className="h-3 w-3" />
                          {rec.property.beds}
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="h-3 w-3" />
                          {rec.property.baths}
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="h-3 w-3" />
                          {rec.property.sqft?.toLocaleString()}
                        </div>
                      </div>

                      <div className="text-lg font-bold text-luxury-gold">
                        ${rec.property.price?.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-luxury-gold/10 rounded-lg border border-luxury-gold/20">
                    <p className="text-sm text-white">
                      <span className="text-luxury-gold font-medium">Why this matches:</span> {rec.reason}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Link href={`/property/${rec.propertyId}`} className="flex-1">
                      <Button className="w-full bg-luxury-gold text-black hover:bg-luxury-gold/90">
                        View Details
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}

        <div className="text-center pt-4 border-t border-luxury-gold/20">
          <Button 
            onClick={generateRecommendations}
            variant="outline"
            className="border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10"
          >
            Refresh Recommendations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}