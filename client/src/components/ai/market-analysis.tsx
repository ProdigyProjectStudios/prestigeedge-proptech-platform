import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Lightbulb, Target, RefreshCw } from "lucide-react";

interface MarketAnalysis {
  averagePrice: number;
  pricePerSqFt: number;
  marketTrend: 'rising' | 'stable' | 'declining';
  keyInsights: string[];
  recommendations: string[];
  topFeatures: string[];
}

interface MarketAnalysisProps {
  location?: string;
  className?: string;
}

export function MarketAnalysis({ location, className }: MarketAnalysisProps) {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ['/api/properties'],
  });

  const generateAnalysis = async () => {
    if (!properties?.properties?.length) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: properties.properties,
          location
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Failed to generate market analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (properties?.properties?.length) {
      generateAnalysis();
    }
  }, [properties, location]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <BarChart3 className="h-4 w-4 text-blue-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising':
        return 'text-green-400 bg-green-400/20 border-green-400/50';
      case 'declining':
        return 'text-red-400 bg-red-400/20 border-red-400/50';
      default:
        return 'text-blue-400 bg-blue-400/20 border-blue-400/50';
    }
  };

  if (isAnalyzing) {
    return (
      <Card className={`bg-luxury-black-medium border-luxury-gold/30 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-luxury-gold">
            <BarChart3 className="h-5 w-5" />
            AI Market Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
              <p className="text-luxury-platinum">Analyzing market data...</p>
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
          <BarChart3 className="h-5 w-5" />
          AI Market Analysis
          {location && (
            <Badge className="bg-luxury-gold/20 text-luxury-gold border-luxury-gold/50 ml-2">
              {location}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-luxury-platinum">
            AI-powered insights and market trends
          </p>
          <Button
            onClick={generateAnalysis}
            variant="outline"
            size="sm"
            disabled={isAnalyzing}
            className="border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!analysis ? (
          <div className="text-center py-6">
            <p className="text-luxury-platinum mb-4">No analysis available</p>
            <Button 
              onClick={generateAnalysis}
              className="bg-luxury-gold text-black hover:bg-luxury-gold/90"
            >
              Generate Analysis
            </Button>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-luxury-black-light border-luxury-gold/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-luxury-gold" />
                    <span className="text-sm text-luxury-platinum">Average Price</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${analysis.averagePrice?.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-luxury-black-light border-luxury-gold/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-luxury-gold" />
                    <span className="text-sm text-luxury-platinum">Price per Sq Ft</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${analysis.pricePerSqFt?.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-luxury-black-light border-luxury-gold/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getTrendIcon(analysis.marketTrend)}
                    <span className="text-sm text-luxury-platinum">Market Trend</span>
                  </div>
                  <Badge className={getTrendColor(analysis.marketTrend)}>
                    {analysis.marketTrend.charAt(0).toUpperCase() + analysis.marketTrend.slice(1)}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-luxury-gold" />
                Key Market Insights
              </h3>
              <div className="space-y-2">
                {analysis.keyInsights?.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-luxury-black-light rounded-lg border border-luxury-gold/20">
                    <div className="w-6 h-6 rounded-full bg-luxury-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-luxury-gold">{index + 1}</span>
                    </div>
                    <p className="text-sm text-white">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-luxury-gold" />
                AI Recommendations
              </h3>
              <div className="space-y-2">
                {analysis.recommendations?.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-luxury-gold/10 rounded-lg border border-luxury-gold/30">
                    <Target className="h-4 w-4 text-luxury-gold flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-white">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Most Valued Features</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.topFeatures?.map((feature, index) => (
                  <Badge key={index} className="bg-luxury-black-light text-luxury-platinum border-luxury-gold/30">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Market Health Indicator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-luxury-platinum">Market Health Score</span>
                <span className="text-sm font-semibold text-luxury-gold">
                  {analysis.marketTrend === 'rising' ? '85%' : analysis.marketTrend === 'stable' ? '75%' : '60%'}
                </span>
              </div>
              <Progress 
                value={analysis.marketTrend === 'rising' ? 85 : analysis.marketTrend === 'stable' ? 75 : 60}
                className="h-2"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}