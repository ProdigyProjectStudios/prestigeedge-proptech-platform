import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

export interface SubscriptionTier {
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

// Subscription tier definitions
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic property browsing',
    price: 0,
    priceId: '',
    features: [
      'Browse luxury properties',
      'Basic search and filters',
      'Property details and photos',
      'Contact agents',
    ],
    limits: {
      properties: 0, // Can't list properties
      aiRequests: 5, // 5 AI requests per month
      virtualTours: 3, // 3 virtual tours per month
      analytics: false,
      prioritySupport: false,
    },
  },
  {
    id: 'basic',
    name: 'Basic Agent',
    description: 'Perfect for individual agents',
    price: 49,
    priceId: 'price_basic_monthly', // Replace with actual Stripe price ID
    features: [
      'List up to 10 properties',
      'AI property descriptions',
      'Basic virtual tours',
      'Lead management',
      'Email support',
    ],
    limits: {
      properties: 10,
      aiRequests: 100,
      virtualTours: 25,
      analytics: false,
      prioritySupport: false,
    },
  },
  {
    id: 'premium',
    name: 'Premium Agent',
    description: 'Advanced features for professionals',
    price: 149,
    priceId: 'price_premium_monthly', // Replace with actual Stripe price ID
    features: [
      'Unlimited property listings',
      'Full AI suite (recommendations, market analysis)',
      'Advanced virtual tours with 360° views',
      'Comprehensive analytics dashboard',
      'Marketing tools and social media content',
      'Priority email support',
    ],
    limits: {
      properties: -1, // Unlimited
      aiRequests: 1000,
      virtualTours: -1, // Unlimited
      analytics: true,
      prioritySupport: true,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Full-featured solution for agencies',
    price: 399,
    priceId: 'price_enterprise_monthly', // Replace with actual Stripe price ID
    features: [
      'Everything in Premium',
      'White-label branding',
      'Custom domain support',
      'Advanced team management',
      'API access',
      'Dedicated account manager',
      'Phone support',
    ],
    limits: {
      properties: -1, // Unlimited
      aiRequests: -1, // Unlimited
      virtualTours: -1, // Unlimited
      analytics: true,
      prioritySupport: true,
    },
  },
];

export class SubscriptionService {
  // Create or retrieve Stripe customer
  async getOrCreateCustomer(userId: string, email: string, name: string): Promise<string> {
    const user = await storage.getUserById(userId);
    
    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });

    await storage.updateUserStripeInfo(userId, {
      stripeCustomerId: customer.id,
    });

    return customer.id;
  }

  // Create subscription
  async createSubscription(userId: string, tierId: string): Promise<{ clientSecret: string, subscriptionId: string }> {
    const user = await storage.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierId);
    if (!tier || tier.id === 'free') {
      throw new Error('Invalid subscription tier');
    }

    const customerId = await this.getOrCreateCustomer(userId, user.email, user.name);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: tier.priceId,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    await storage.updateUserStripeInfo(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: 'inactive',
      subscriptionTier: tierId,
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    return {
      clientSecret: paymentIntent.client_secret!,
      subscriptionId: subscription.id,
    };
  }

  // Handle subscription webhook events
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) return;
        
        const userId = customer.metadata?.userId;
        if (!userId) return;

        const status = subscription.status;
        const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
        
        // Determine tier from price ID
        const priceId = subscription.items.data[0]?.price.id;
        const tier = SUBSCRIPTION_TIERS.find(t => t.priceId === priceId);
        
        await storage.updateUserStripeInfo(userId, {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: status,
          subscriptionTier: tier?.id || 'free',
          subscriptionStartDate: new Date((subscription as any).current_period_start * 1000),
          subscriptionEndDate: currentPeriodEnd,
        });
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) return;
        
        const userId = customer.metadata?.userId;
        if (!userId) return;

        await storage.updateUserStripeInfo(userId, {
          subscriptionStatus: 'canceled',
          subscriptionTier: 'free',
          subscriptionEndDate: new Date(),
        });
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (customer.deleted) return;
          
          const userId = customer.metadata?.userId;
          if (!userId) return;

          await storage.updateUserStripeInfo(userId, {
            subscriptionStatus: 'active',
          });
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (customer.deleted) return;
          
          const userId = customer.metadata?.userId;
          if (!userId) return;

          await storage.updateUserStripeInfo(userId, {
            subscriptionStatus: 'past_due',
          });
        }
        break;
      }
    }
  }

  // Get user's current subscription info
  async getUserSubscription(userId: string): Promise<{
    tier: SubscriptionTier;
    status: string;
    startDate?: Date;
    endDate?: Date;
  }> {
    const user = await storage.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const tier = SUBSCRIPTION_TIERS.find(t => t.id === (user.subscriptionTier || 'free'))!;
    
    return {
      tier,
      status: user.subscriptionStatus || 'inactive',
      startDate: user.subscriptionStartDate || undefined,
      endDate: user.subscriptionEndDate || undefined,
    };
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<void> {
    const user = await storage.getUserById(userId);
    if (!user?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Create customer portal session
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const user = await storage.getUserById(userId);
    if (!user?.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }
}

export const subscriptionService = new SubscriptionService();