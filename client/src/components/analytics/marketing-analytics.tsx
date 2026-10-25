import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Target, 
  DollarSign,
  Eye,
  MousePointer,
  Users
} from "lucide-react";

interface MarketingCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  budget: number;
  spent: number;
  clicks: number;
  impressions: number;
  conversions: number;
  createdAt: string;
}

interface MarketingAnalytics {
  totalViews: number;
  totalLeads: number;
  conversionRate: number;
}

export default function MarketingAnalytics() {
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<MarketingCampaign[]>({
    queryKey: ['/api/marketing/campaigns'],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<MarketingAnalytics>({
    queryKey: ['/api/marketing/analytics'],
  });

  if (campaignsLoading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-luxury-black-light border-luxury-gold/20">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-luxury-black animate-pulse rounded"></div>
                <div className="h-8 w-16 bg-luxury-black animate-pulse rounded"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!campaigns || !analytics) return null;

  const campaignPerformanceData = campaigns.map(campaign => ({
    name: campaign.name.split(' ')[0], // Shorten name for chart
    clicks: campaign.clicks,
    impressions: campaign.impressions,
    conversions: campaign.conversions,
    ctr: ((campaign.clicks / campaign.impressions) * 100).toFixed(2),
    cpc: (campaign.spent / campaign.clicks).toFixed(2),
    roas: ((campaign.conversions * 500000) / campaign.spent).toFixed(1) // Assuming avg property inquiry value
  }));

  return (
    <div className="space-y-6">
      {/* Key Marketing Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalViews.toLocaleString()}</div>
            <p className="text-xs text-gray-400">
              Property page views
            </p>
          </CardContent>
        </Card>

        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalLeads}</div>
            <p className="text-xs text-gray-400">
              Qualified inquiries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.conversionRate}%</div>
            <p className="text-xs text-gray-400">
              Views to inquiries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Chart */}
      <Card className="bg-luxury-black-light border-luxury-gold/20">
        <CardHeader>
          <CardTitle className="text-white">Campaign Performance</CardTitle>
          <CardDescription className="text-gray-400">
            Clicks, impressions, and conversions by campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={campaignPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#D4AF37' }}
                axisLine={{ stroke: '#D4AF37' }}
              />
              <YAxis 
                tick={{ fill: '#D4AF37' }}
                axisLine={{ stroke: '#D4AF37' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '1px solid #D4AF37',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Area
                type="monotone"
                dataKey="impressions"
                stackId="1"
                stroke="#D4AF37"
                fill="#D4AF37"
                fillOpacity={0.6}
                name="Impressions"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stackId="2"
                stroke="#B8860B"
                fill="#B8860B"
                fillOpacity={0.8}
                name="Clicks"
              />
              <Area
                type="monotone"
                dataKey="conversions"
                stackId="3"
                stroke="#FFD700"
                fill="#FFD700"
                fillOpacity={0.9}
                name="Conversions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Details */}
      <Card className="bg-luxury-black-light border-luxury-gold/20">
        <CardHeader>
          <CardTitle className="text-white">Active Campaigns</CardTitle>
          <CardDescription className="text-gray-400">
            Detailed campaign metrics and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="border border-luxury-gold/20 rounded-lg p-4 bg-luxury-black/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                  <Badge 
                    variant={campaign.status === 'active' ? 'default' : 'secondary'}
                    className={campaign.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}
                  >
                    {campaign.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Budget</p>
                    <p className="text-white font-medium">${campaign.budget.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Spent</p>
                    <p className="text-white font-medium">${campaign.spent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">CTR</p>
                    <p className="text-white font-medium">
                      {((campaign.clicks / campaign.impressions) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Conversions</p>
                    <p className="text-white font-medium">{campaign.conversions}</p>
                  </div>
                </div>
                
                <div className="mt-3 bg-luxury-black-light rounded-lg p-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Budget Usage</span>
                    <span>{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-luxury-gold h-2 rounded-full" 
                      style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader>
            <CardTitle className="text-white">Click-Through Rates</CardTitle>
            <CardDescription className="text-gray-400">
              CTR performance by campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={campaignPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#D4AF37' }}
                  axisLine={{ stroke: '#D4AF37' }}
                />
                <YAxis 
                  tick={{ fill: '#D4AF37' }}
                  axisLine={{ stroke: '#D4AF37' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #D4AF37',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value}%`, 'CTR']}
                />
                <Bar dataKey="ctr" fill="#D4AF37" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader>
            <CardTitle className="text-white">Return on Ad Spend</CardTitle>
            <CardDescription className="text-gray-400">
              ROAS by campaign (estimated)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={campaignPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#D4AF37' }}
                  axisLine={{ stroke: '#D4AF37' }}
                />
                <YAxis 
                  tick={{ fill: '#D4AF37' }}
                  axisLine={{ stroke: '#D4AF37' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #D4AF37',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value}:1`, 'ROAS']}
                />
                <Line 
                  type="monotone" 
                  dataKey="roas" 
                  stroke="#FFD700" 
                  strokeWidth={3}
                  dot={{ fill: '#FFD700', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}