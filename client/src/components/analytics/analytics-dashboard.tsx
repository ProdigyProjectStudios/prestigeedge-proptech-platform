import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Home, 
  MessageCircle, 
  DollarSign,
  Target,
  Eye,
  Calendar
} from "lucide-react";

interface AnalyticsSummary {
  totalProperties: number;
  activeListings: number;
  totalUsers: number;
  totalInquiries: number;
  averagePropertyPrice: number;
  priceDistribution: Record<string, number>;
  usersByRole: {
    clients: number;
    agents: number;
    admins: number;
  };
  inquiryStatus: {
    open: number;
    in_progress: number;
    closed: number;
  };
}

const COLORS = ['#D4AF37', '#B8860B', '#DAA520', '#FFD700'];

export default function AnalyticsDashboard() {
  const { data: summary, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['/api/analytics/summary'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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

  if (!summary) return null;

  const priceDistributionData = Object.entries(summary.priceDistribution).map(([label, count]) => ({
    name: label,
    value: count,
    percentage: ((count / summary.totalProperties) * 100).toFixed(1)
  }));

  const userRoleData = Object.entries(summary.usersByRole).map(([role, count]) => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value: count,
    percentage: ((count / summary.totalUsers) * 100).toFixed(1)
  }));

  const inquiryStatusData = Object.entries(summary.inquiryStatus).map(([status, count]) => ({
    name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    percentage: summary.totalInquiries > 0 ? ((count / summary.totalInquiries) * 100).toFixed(1) : '0'
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Properties</CardTitle>
            <Home className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{summary.totalProperties}</div>
            <p className="text-xs text-gray-400">
              {summary.activeListings} active listings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Users</CardTitle>
            <Users className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{summary.totalUsers}</div>
            <p className="text-xs text-gray-400">
              {summary.usersByRole.clients} clients, {summary.usersByRole.agents} agents
            </p>
          </CardContent>
        </Card>

        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Inquiries</CardTitle>
            <MessageCircle className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{summary.totalInquiries}</div>
            <p className="text-xs text-gray-400">
              {summary.inquiryStatus.open} open, {summary.inquiryStatus.in_progress} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Avg Property Price</CardTitle>
            <DollarSign className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${(summary.averagePropertyPrice / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-gray-400">
              Portfolio average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Price Distribution */}
        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader>
            <CardTitle className="text-white">Property Price Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Properties by price range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priceDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priceDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #D4AF37',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card className="bg-luxury-black-light border-luxury-gold/20">
          <CardHeader>
            <CardTitle className="text-white">User Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Users by role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userRoleData}>
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
                <Bar dataKey="value" fill="#D4AF37" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Inquiry Status */}
      <Card className="bg-luxury-black-light border-luxury-gold/20">
        <CardHeader>
          <CardTitle className="text-white">Inquiry Status Overview</CardTitle>
          <CardDescription className="text-gray-400">
            Current inquiry pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inquiryStatusData.map((item, index) => (
              <div key={item.name} className="flex items-center space-x-4">
                <div className="w-20 text-sm text-gray-300">{item.name}</div>
                <div className="flex-1">
                  <Progress 
                    value={parseFloat(item.percentage)} 
                    className="h-2"
                    style={{
                      background: '#333',
                    }}
                  />
                </div>
                <div className="text-sm text-white w-16 text-right">
                  {item.value} ({item.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Google Analytics Status */}
      <Card className="bg-luxury-black-light border-luxury-gold/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-luxury-gold" />
            Analytics Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Backend Analytics</span>
              <Badge variant="default" className="bg-green-600 text-white">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Google Analytics 4</span>
              <Badge variant={import.meta.env.VITE_GA_MEASUREMENT_ID ? "default" : "secondary"} 
                     className={import.meta.env.VITE_GA_MEASUREMENT_ID ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}>
                {import.meta.env.VITE_GA_MEASUREMENT_ID ? "Configured" : "Pending Setup"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Real-time Tracking</span>
              <Badge variant="default" className="bg-green-600 text-white">Enabled</Badge>
            </div>
          </div>
          
          {!import.meta.env.VITE_GA_MEASUREMENT_ID && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <p className="text-sm text-yellow-200">
                To enable Google Analytics 4, add your Measurement ID (starts with "G-") to the VITE_GA_MEASUREMENT_ID secret.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}