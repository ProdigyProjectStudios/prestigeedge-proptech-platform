import Anthropic from '@anthropic-ai/sdk';

// Using Replit AI Integrations for Anthropic — billed to Replit credits,
// no separate Anthropic API key or account needed.
// Models available via Replit AI Integrations (prefer these):
//   claude-sonnet-4-6  — balanced performance/speed (recommended)
//   claude-opus-4-8    — most capable, complex reasoning
//   claude-haiku-4-5   — fastest, simple tasks
const DEFAULT_MODEL_STR = "claude-sonnet-4-6";

const FAST_MAX_TOKENS = 300;
const STANDARD_MAX_TOKENS = 600;
const DETAILED_MAX_TOKENS = 1000;

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// Simple in-memory cache for AI responses
const responseCache = new Map<string, { response: any, timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export class AIService {
  private extractTextFromResponse(response: any): string {
    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  private getCacheKey(prompt: string, maxTokens: number): string {
    return `${prompt.slice(0, 100)}_${maxTokens}`;
  }

  private async makeAIRequest(prompt: string, maxTokens: number = FAST_MAX_TOKENS): Promise<any> {
    const cacheKey = this.getCacheKey(prompt, maxTokens);
    const cached = responseCache.get(cacheKey);
    
    // Return cached response if valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.response;
    }

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      // Cache the response
      responseCache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    } catch (error) {
      console.error('AI Request Error:', error);
      throw error;
    }
  }

  // Generate luxury property descriptions (Optimized for speed)
  async generatePropertyDescription(property: any): Promise<string> {
    try {
      const prompt = `Create a luxury property description for: ${property.title} in ${property.location}, $${property.price?.toLocaleString()}, ${property.beds}bed/${property.baths}bath, ${property.sqft?.toLocaleString()}sqft ${property.propertyType}. Features: ${property.features?.slice(0, 3).join(', ') || 'Premium amenities'}. Write 2 paragraphs targeting affluent buyers.`;

      const response = await this.makeAIRequest(prompt, STANDARD_MAX_TOKENS);
      return this.extractTextFromResponse(response);
    } catch (error) {
      console.error('AI Description Generation Error:', error);
      return property.description || 'Luxury property with exceptional features and prime location.';
    }
  }

  // Generate smart property recommendations (Optimized)
  async getPropertyRecommendations(userPreferences: any, availableProperties: any[]): Promise<any[]> {
    try {
      const topProps = availableProperties.slice(0, 6); // Limit to top 6 for faster processing
      const prompt = `Recommend top 3 from: Budget $${userPreferences.maxPrice?.toLocaleString() || 'Any'}, Location: ${userPreferences.location || 'Any'}, ${userPreferences.beds || 'Any'} beds.

Properties: ${topProps.map((p, i) => `${i + 1}. ${p.title} - $${p.price?.toLocaleString()}, ${p.location}, ${p.beds}bed`).join('; ')}

Return JSON: [{"propertyId": "id", "matchScore": 90, "reason": "Brief match reason"}]`;

      const response = await this.makeAIRequest(prompt, STANDARD_MAX_TOKENS);
      let responseText = this.extractTextFromResponse(response);
      
      // Clean and parse JSON
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      const recommendations = JSON.parse(responseText);
      return recommendations;
    } catch (error) {
      console.error('AI Recommendations Error:', error);
      return availableProperties.slice(0, 3).map(p => ({
        propertyId: p.id,
        matchScore: 85,
        reason: 'Recommended based on your preferences'
      }));
    }
  }

  // AI Chatbot for property inquiries (Optimized for speed)
  async processChatMessage(message: string, context: any = {}): Promise<string> {
    try {
      const prompt = `ARIA, PrestigeEdge luxury concierge. User: "${message}". Context: ${context.propertyCount || '24'} luxury listings ($3.75M-$28.5M). Respond professionally, 1-2 sentences, offer help with properties/viewings.`;

      const response = await this.makeAIRequest(prompt, FAST_MAX_TOKENS);
      return this.extractTextFromResponse(response);
    } catch (error) {
      console.error('AI Chat Error:', error);
      return "I'm here to assist you with our exclusive luxury property portfolio. How may I help you find your perfect estate today?";
    }
  }

  // Market analysis and insights
  async generateMarketAnalysis(properties: any[], location?: string): Promise<any> {
    try {
      const prompt = `You are a luxury real estate market analyst. Analyze the current market data and provide insights.

Market Data:
${properties.map(p => `
- ${p.location}: $${p.price?.toLocaleString()} (${p.beds}bed/${p.baths}bath, ${p.sqft?.toLocaleString()}sqft)
`).join('')}

${location ? `Focus Area: ${location}` : 'Overall Market Analysis'}

Provide a JSON response with:
{
  "averagePrice": number,
  "pricePerSqFt": number,
  "marketTrend": "rising|stable|declining",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2"],
  "topFeatures": ["feature1", "feature2", "feature3"]
}

Base your analysis on luxury market trends and high-end buyer preferences.`;

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      let responseText = this.extractTextFromResponse(response);
      // Remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Find JSON content if it's embedded in text
      const jsonMatch = responseText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      return JSON.parse(responseText);
    } catch (error) {
      console.error('AI Market Analysis Error:', error);
      return {
        averagePrice: properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length,
        pricePerSqFt: 800,
        marketTrend: "stable",
        keyInsights: ["Luxury market remains strong", "High demand for premium locations", "Virtual tours increasing engagement"],
        recommendations: ["Focus on unique amenities", "Highlight location benefits"],
        topFeatures: ["Ocean views", "Smart home technology", "Private amenities"]
      };
    }
  }

  // Lead qualification and scoring
  async qualifyLead(leadData: any): Promise<any> {
    try {
      const prompt = `You are a luxury real estate lead qualification specialist. Score and analyze this potential client.

Lead Information:
- Budget: $${leadData.budget?.toLocaleString() || 'Not specified'}
- Property Interest: ${leadData.propertyType || 'Not specified'}
- Timeline: ${leadData.timeline || 'Not specified'}
- Contact Method: ${leadData.contactMethod || 'Website inquiry'}
- Message: "${leadData.message || 'General inquiry'}"
- Viewing History: ${leadData.viewedProperties || 0} properties viewed
- Engagement Level: ${leadData.engagementLevel || 'New visitor'}

Provide a JSON response with:
{
  "qualificationScore": number (0-100),
  "leadTier": "hot|warm|cold",
  "buyingProbability": number (0-100),
  "recommendedActions": ["action1", "action2"],
  "notes": "Brief analysis of lead quality",
  "followUpPriority": "high|medium|low"
}`;

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      let responseText = this.extractTextFromResponse(response);
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      return JSON.parse(responseText);
    } catch (error) {
      console.error('AI Lead Qualification Error:', error);
      return {
        qualificationScore: 60,
        leadTier: "warm",
        buyingProbability: 65,
        recommendedActions: ["Schedule property viewing", "Provide market analysis"],
        notes: "Potential client requiring follow-up",
        followUpPriority: "medium"
      };
    }
  }

  // Marketing content generation
  async generateMarketingContent(property: any, contentType: string): Promise<any> {
    try {
      const prompt = `You are a luxury real estate marketing specialist. Create ${contentType} content for this property.

Property Details:
- Title: ${property.title}
- Location: ${property.location}
- Price: $${property.price?.toLocaleString()}
- Type: ${property.propertyType}
- Features: ${property.features?.join(', ') || 'Luxury amenities'}

Content Type: ${contentType}

Generate appropriate marketing content with sophisticated language targeting high-net-worth individuals.`;

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      return {
        content: this.extractTextFromResponse(response),
        type: contentType,
        propertyId: property.id
      };
    } catch (error) {
      console.error('AI Marketing Content Error:', error);
      return {
        content: `Discover luxury living at its finest with this exceptional ${property.propertyType} in ${property.location}.`,
        type: contentType,
        propertyId: property.id
      };
    }
  }

  // Property valuation
  async generatePropertyValuation(address: string): Promise<any> {
    try {
      const prompt = `You are a luxury real estate appraiser. Provide a market valuation analysis for: ${address}

Generate a realistic valuation report considering:
- Location premium
- Market trends
- Comparable properties
- Luxury market factors

Provide a JSON response with:
{
  "estimatedValue": number,
  "valuationRange": {"min": number, "max": number},
  "confidenceLevel": number (0-100),
  "marketFactors": ["factor1", "factor2"],
  "comparableProperties": ["address1", "address2"],
  "notes": "Valuation methodology and considerations"
}`;

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      let responseText = this.extractTextFromResponse(response);
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      return JSON.parse(responseText);
    } catch (error) {
      console.error('AI Valuation Error:', error);
      return {
        estimatedValue: 5000000,
        valuationRange: { min: 4500000, max: 5500000 },
        confidenceLevel: 75,
        marketFactors: ["Prime location", "Luxury amenities", "Market demand"],
        comparableProperties: ["Similar properties in area"],
        notes: "Preliminary valuation based on market analysis"
      };
    }
  }

  // Virtual staging suggestions
  async generateVirtualStaging(propertyId: string, style: string): Promise<any> {
    try {
      const prompt = `You are a luxury interior design consultant. Suggest virtual staging for property ${propertyId} in ${style} style.

Provide detailed staging recommendations that would appeal to luxury buyers.

Return a JSON response with:
{
  "stagingPlan": "Detailed staging description",
  "roomSuggestions": ["room1 suggestions", "room2 suggestions"],
  "colorScheme": ["color1", "color2", "color3"],
  "furnitureStyle": "Style description",
  "keyFeatures": ["feature1", "feature2"],
  "estimatedCost": number,
  "timeline": "Implementation timeline"
}`;

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      let responseText = this.extractTextFromResponse(response);
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      return JSON.parse(responseText);
    } catch (error) {
      console.error('AI Virtual Staging Error:', error);
      return {
        stagingPlan: `Elegant ${style} staging with luxury furnishings and sophisticated color palette.`,
        roomSuggestions: ["Master bedroom with premium bedding", "Living room with designer furniture"],
        colorScheme: ["Neutral tones", "Gold accents", "Deep blues"],
        furnitureStyle: `Modern ${style} luxury`,
        keyFeatures: ["Statement lighting", "Luxury textiles", "Art collection"],
        estimatedCost: 15000,
        timeline: "2-3 weeks"
      };
    }
  }
}

export const aiService = new AIService();