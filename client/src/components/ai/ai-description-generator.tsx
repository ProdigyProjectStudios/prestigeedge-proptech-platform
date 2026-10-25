import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Copy, RefreshCw, Wand2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIDescriptionGeneratorProps {
  property: any;
  onDescriptionGenerated?: (description: string) => void;
  className?: string;
}

export function AIDescriptionGenerator({ 
  property, 
  onDescriptionGenerated, 
  className 
}: AIDescriptionGeneratorProps) {
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const generateDescription = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ property })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setGeneratedDescription(data.description);
      onDescriptionGenerated?.(data.description);
      
      toast({
        title: "Description Generated!",
        description: "AI has created a compelling property description.",
      });
    } catch (error) {
      console.error('Failed to generate description:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedDescription);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      toast({
        title: "Copied!",
        description: "Description copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Error",
        description: "Failed to copy text to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`bg-luxury-black-medium border-luxury-gold/30 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-luxury-gold">
          <Wand2 className="h-5 w-5" />
          AI Description Generator
        </CardTitle>
        <p className="text-sm text-luxury-platinum">
          Generate compelling, luxury-focused property descriptions powered by AI
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property Preview */}
        <div className="p-4 bg-luxury-black-light rounded-lg border border-luxury-gold/20">
          <h3 className="font-semibold text-white mb-2">{property.title}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-luxury-platinum">
            <div>Location: {property.location}</div>
            <div>Price: ${property.price?.toLocaleString()}</div>
            <div>Bedrooms: {property.beds}</div>
            <div>Bathrooms: {property.baths}</div>
            <div>Sq Ft: {property.sqft?.toLocaleString()}</div>
            <div>Type: {property.propertyType}</div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateDescription}
          disabled={isGenerating}
          className="w-full bg-luxury-gold text-black hover:bg-luxury-gold/90 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating Description...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Description
            </>
          )}
        </Button>

        {/* Generated Description */}
        {generatedDescription && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-luxury-gold/20 text-luxury-gold border-luxury-gold/50">
                AI Generated
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10"
                >
                  {isCopied ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateDescription}
                  disabled={isGenerating}
                  className="border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            </div>

            <Textarea
              value={generatedDescription}
              onChange={(e) => {
                setGeneratedDescription(e.target.value);
                onDescriptionGenerated?.(e.target.value);
              }}
              className="min-h-[200px] bg-luxury-black-light border-luxury-gold/30 text-white placeholder:text-luxury-platinum focus:border-luxury-gold resize-none"
              placeholder="Generated description will appear here..."
            />

            <div className="flex items-center gap-2 text-xs text-luxury-platinum">
              <Sparkles className="h-3 w-3" />
              <span>AI-powered description optimized for luxury real estate marketing</span>
            </div>
          </div>
        )}

        {!generatedDescription && (
          <div className="text-center py-8 text-luxury-platinum">
            <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click "Generate AI Description" to create compelling property copy</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}