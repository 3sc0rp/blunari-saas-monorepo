import { useState, useEffect } from "react";
// Remove AdminLayout import as it's not being used consistently
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Crown,
  Zap
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  features: any;
  is_popular: boolean;
  max_staff_accounts: number;
  max_bookings_per_month: number;
  max_tables: number;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan_id: string;
  pricing_plans: PricingPlan;
}

interface UsageData {
  staff_count: number;
  bookings_this_month: number;
  tables_count: number;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Load current subscription
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select(`
          *,
          pricing_plans (*)
        `)
        .eq('status', 'active')
        .maybeSingle();

      setSubscription(subscriptionData);

      // Load usage data
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: tenantData } = await supabase
          .rpc('get_user_tenant', { p_user_id: userData.user.id })
          .single();

        if (tenantData) {
          // Get staff count
          const { count: staffCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');

          // Get bookings this month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          
          const { count: bookingsCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfMonth.toISOString());

          // Get tables count
          const { count: tablesCount } = await supabase
            .from('restaurant_tables')
            .select('*', { count: 'exact', head: true })
            .eq('active', true);

          setUsage({
            staff_count: staffCount || 0,
            bookings_this_month: bookingsCount || 0,
            tables_count: tablesCount || 0
          });
        }
      }

      // Load available plans
      const { data: plansData } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price');

      setPlans(plansData || []);
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast({
        title: "Error",
        description: "Failed to load billing information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planSlug: string, billingCycle: 'monthly' | 'yearly') => {
    try {
      setProcessingCheckout(planSlug);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planSlug, billingCycle }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive"
      });
    } finally {
      setProcessingCheckout(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;

      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive"
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  const getUsagePercentage = (current: number, limit: number | null) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'trialing':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'past_due':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'canceled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted/20';
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
          <p className="text-muted-foreground">
            Manage your subscription, view usage, and upgrade your plan
          </p>
        </div>
        {subscription && (
          <Button onClick={handleManageSubscription} variant="outline">
            <ExternalLink className="w-4 h-4 mr-2" />
            Manage Subscription
          </Button>
        )}
      </div>

      {/* ... keep existing code (subscription cards, usage overview, plans) */}
      
      {/* Current Subscription */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Current Plan: {subscription.pricing_plans.name}
              {subscription.pricing_plans.is_popular && (
                <Badge variant="secondary">Most Popular</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {subscription.pricing_plans.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <Badge className={getStatusColor(subscription.status)}>
                {subscription.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Current Period</span>
              <span>
                {format(new Date(subscription.current_period_start), 'MMM d')} - 
                {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Next Billing</span>
              <span>
                {formatDistanceToNow(new Date(subscription.current_period_end), { addSuffix: true })}
              </span>
            </div>
            {subscription.cancel_at_period_end && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span>Your subscription will be canceled at the end of the current period</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Overview */}
      {usage && subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Usage Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Staff Accounts</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.staff_count} / {subscription.pricing_plans.max_staff_accounts || '∞'}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.staff_count, subscription.pricing_plans.max_staff_accounts)} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Bookings This Month</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.bookings_this_month} / {subscription.pricing_plans.max_bookings_per_month || '∞'}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.bookings_this_month, subscription.pricing_plans.max_bookings_per_month)} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tables</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.tables_count} / {subscription.pricing_plans.max_tables || '∞'}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.tables_count, subscription.pricing_plans.max_tables)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Upgrade or downgrade your plan to match your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly (Save 10%)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="monthly" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-primary' : ''}`}>
                    {plan.is_popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {plan.slug === 'starter' && <Zap className="w-5 h-5" />}
                        {plan.slug === 'professional' && <Crown className="w-5 h-5" />}
                        {plan.slug === 'enterprise' && <Users className="w-5 h-5" />}
                        {plan.name}
                      </CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold">
                          {formatPrice(plan.monthly_price)}
                          <span className="text-base font-normal text-muted-foreground">/month</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Separator />
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div>• Up to {plan.max_staff_accounts || 'unlimited'} staff accounts</div>
                        <div>• Up to {plan.max_bookings_per_month || 'unlimited'} bookings/month</div>
                        <div>• Up to {plan.max_tables || 'unlimited'} tables</div>
                      </div>
                      <Button 
                        className="w-full" 
                        variant={subscription?.plan_id === plan.id ? "outline" : "default"}
                        disabled={subscription?.plan_id === plan.id || processingCheckout === plan.slug}
                        onClick={() => handleUpgrade(plan.slug, 'monthly')}
                      >
                        {subscription?.plan_id === plan.id ? "Current Plan" : 
                         processingCheckout === plan.slug ? "Processing..." : "Upgrade"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="yearly" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-primary' : ''}`}>
                    {plan.is_popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {plan.slug === 'starter' && <Zap className="w-5 h-5" />}
                        {plan.slug === 'professional' && <Crown className="w-5 h-5" />}
                        {plan.slug === 'enterprise' && <Users className="w-5 h-5" />}
                        {plan.name}
                      </CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold">
                          {formatPrice(plan.yearly_price || plan.monthly_price * 12)}
                          <span className="text-base font-normal text-muted-foreground">/year</span>
                        </div>
                        {plan.yearly_price && (
                          <div className="text-sm text-green-600">
                            Save {formatPrice((plan.monthly_price * 12) - plan.yearly_price)} yearly
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Separator />
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div>• Up to {plan.max_staff_accounts || 'unlimited'} staff accounts</div>
                        <div>• Up to {plan.max_bookings_per_month || 'unlimited'} bookings/month</div>
                        <div>• Up to {plan.max_tables || 'unlimited'} tables</div>
                      </div>
                      <Button 
                        className="w-full" 
                        variant={subscription?.plan_id === plan.id ? "outline" : "default"}
                        disabled={subscription?.plan_id === plan.id || processingCheckout === plan.slug}
                        onClick={() => handleUpgrade(plan.slug, 'yearly')}
                      >
                        {subscription?.plan_id === plan.id ? "Current Plan" : 
                         processingCheckout === plan.slug ? "Processing..." : "Upgrade"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}