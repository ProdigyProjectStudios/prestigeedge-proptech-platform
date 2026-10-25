import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, Crown, Zap, Star, ArrowRight, CreditCard } from "lucide-react";
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from "wouter";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  features: string[];
  limits: {
    properties: number;
    aiRequests: number;
    virtualTours: number;
    analytics: boolean;
    prioritySupport: boolean;
  };
}

const CheckoutForm = ({ tier, onSuccess }: { tier: SubscriptionTier; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscription?success=true`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Subscription Activated",
        description: `Welcome to ${tier.name}! Your subscription is now active.`,
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isLoading}
        className="w-full bg-luxury-gold text-black hover:bg-luxury-gold/90 h-12 text-lg font-semibold"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          `Subscribe to ${tier.name} - $${tier.price}/month`
        )}
      </Button>
    </form>
  );
};

const SubscriptionCard = ({ 
  tier, 
  isCurrentTier, 
  onUpgrade 
}: { 
  tier: SubscriptionTier; 
  isCurrentTier: boolean; 
  onUpgrade: (tier: SubscriptionTier) => void;
}) => {
  const isPopular = tier.id === 'premium';
  const isFree = tier.id === 'free';
  
  return (
    <Card className={`relative bg-luxury-black-medium border-luxury-gold/30 hover:border-luxury-gold/50 transition-all duration-300 ${
      isPopular ? 'ring-2 ring-luxury-gold shadow-2xl scale-105' : ''
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-luxury-gold text-black px-4 py-1 text-sm font-semibold">
            <Star className="w-4 h-4 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-8 pt-8">
        <div className="flex items-center justify-center mb-4">
          {tier.id === 'free' && <Zap className="w-8 h-8 text-luxury-gold" />}
          {tier.id === 'basic' && <CreditCard className="w-8 h-8 text-luxury-gold" />}
          {tier.id === 'premium' && <Crown className="w-8 h-8 text-luxury-gold" />}
          {tier.id === 'enterprise' && <Star className="w-8 h-8 text-luxury-gold" />}
        </div>
        
        <CardTitle className="text-2xl font-bold text-white mb-2">{tier.name}</CardTitle>
        <p className="text-luxury-platinum text-sm mb-4">{tier.description}</p>
        
        <div className="mb-6">
          <span className="text-4xl font-bold text-luxury-gold">${tier.price}</span>
          {!isFree && <span className="text-luxury-platinum">/month</span>}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <ul className="space-y-3">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-luxury-gold flex-shrink-0 mt-0.5" />
              <span className="text-luxury-platinum text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        <div className="pt-4 border-t border-luxury-gold/20">
          <div className="text-xs text-luxury-platinum space-y-1">
            <p>• Properties: {tier.limits.properties === -1 ? 'Unlimited' : tier.limits.properties}</p>
            <p>• AI Requests: {tier.limits.aiRequests === -1 ? 'Unlimited' : `${tier.limits.aiRequests}/month`}</p>
            <p>• Virtual Tours: {tier.limits.virtualTours === -1 ? 'Unlimited' : `${tier.limits.virtualTours}/month`}</p>
            <p>• Analytics: {tier.limits.analytics ? 'Yes' : 'No'}</p>
            <p>• Priority Support: {tier.limits.prioritySupport ? 'Yes' : 'No'}</p>
          </div>
        </div>
        
        <Button
          onClick={() => onUpgrade(tier)}
          disabled={isCurrentTier}
          className={`w-full h-12 text-lg font-semibold transition-all duration-300 ${
            isCurrentTier 
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
              : isPopular
              ? 'bg-luxury-gold text-black hover:bg-luxury-gold/90 shadow-lg hover:shadow-xl'
              : 'bg-luxury-black-light border border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black'
          }`}
        >
          {isCurrentTier ? (
            'Current Plan'
          ) : isFree ? (
            'Current Plan'
          ) : (
            <>
              Upgrade Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default function Subscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [showCheckout, setShowCheckout] = useState(false);

  // Fetch available tiers
  const { data: tiersData } = useQuery<{ tiers: SubscriptionTier[] }>({
    queryKey: ['/api/subscription/tiers'],
  });

  // Fetch current subscription
  const { data: currentSubscription } = useQuery<{
    tier: SubscriptionTier;
    status: string;
    endDate?: string;
  }>({
    queryKey: ['/api/subscription/current'],
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const response = await apiRequest('POST', '/api/subscription/create', { tierId });
      return response;
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setShowCheckout(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (tier.id === 'free') return;
    
    setSelectedTier(tier);
    createSubscriptionMutation.mutate(tier.id);
  };

  const handleSuccess = () => {
    setShowCheckout(false);
    setSelectedTier(null);
    queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
    toast({
      title: "Success!",
      description: "Your subscription has been activated.",
    });
  };

  if (showCheckout && clientSecret && selectedTier) {
    return (
      <div className="min-h-screen bg-luxury-black text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-luxury-gold mb-2">Complete Your Subscription</h1>
              <p className="text-luxury-platinum">
                You're subscribing to <span className="text-white font-semibold">{selectedTier.name}</span>
              </p>
            </div>
            
            <Card className="bg-luxury-black-medium border-luxury-gold/30">
              <CardContent className="p-8">
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm tier={selectedTier} onSuccess={handleSuccess} />
                </Elements>
              </CardContent>
            </Card>
            
            <div className="text-center mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowCheckout(false)}
                className="text-luxury-platinum hover:text-white"
              >
                ← Back to Plans
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-luxury-gold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-luxury-platinum max-w-2xl mx-auto">
            Unlock the full potential of our luxury real estate platform with advanced AI features and professional tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {tiersData?.tiers?.map((tier: SubscriptionTier) => (
            <SubscriptionCard
              key={tier.id}
              tier={tier}
              isCurrentTier={currentSubscription?.tier?.id === tier.id}
              onUpgrade={handleUpgrade}
            />
          )) || (
            <div className="col-span-4 text-center">
              <p className="text-luxury-platinum">Loading subscription plans...</p>
            </div>
          )}
        </div>

        {currentSubscription && (
          <div className="max-w-2xl mx-auto mt-12">
            <Card className="bg-luxury-black-medium border-luxury-gold/30">
              <CardHeader>
                <CardTitle className="text-luxury-gold">Current Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-luxury-platinum">Plan</p>
                    <p className="text-white font-semibold">{currentSubscription.tier?.name}</p>
                  </div>
                  <div>
                    <p className="text-luxury-platinum">Status</p>
                    <Badge 
                      className={
                        currentSubscription.status === 'active' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-yellow-600 text-white'
                      }
                    >
                      {currentSubscription.status}
                    </Badge>
                  </div>
                  {currentSubscription.endDate && (
                    <div className="col-span-2">
                      <p className="text-luxury-platinum">Next Billing Date</p>
                      <p className="text-white">
                        {new Date(currentSubscription.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}