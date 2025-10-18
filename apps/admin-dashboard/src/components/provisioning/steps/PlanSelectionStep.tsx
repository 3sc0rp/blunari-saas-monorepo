import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Zap, Building, CreditCard } from "lucide-react";
import type { ProvisioningData } from "../ProvisioningWizard";
import { supabase } from "@/integrations/supabase/client";

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthly_price: number;
  yearly_price: number | null;
  features: any; // Using any to handle JSON type from Supabase
  max_tables: number | null;
  max_bookings_per_month: number | null;
  max_staff_accounts: number | null;
  is_popular: boolean;
}

interface PlanSelectionStepProps {
  data: ProvisioningData;
  updateData: (updates: Partial<ProvisioningData>) => void;
}

export function PlanSelectionStep({
  data,
  updateData,
}: PlanSelectionStepProps) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: plansData, error } = await supabase
          .from("pricing_plans")
          .select("*")
          .eq("is_active", true)
          .order("monthly_price");

        if (error) throw error;
        setPlans(
          (plansData || []).map((plan) => ({
            ...plan,
            features: Array.isArray(plan.features) ? plan.features : [],
          })),
        );
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(0);
  };

  const getDisplayPrice = (plan: PricingPlan) => {
    if (data.billingCycle === "yearly" && plan.yearly_price) {
      return plan.yearly_price / 12;
    }
    return plan.monthly_price;
  };

  const getYearlyDiscount = (
    monthlyPrice: number,
    yearlyPrice: number | null,
  ) => {
    if (!yearlyPrice) return 0;
    const yearlyMonthly = yearlyPrice / 12;
    const discount = ((monthlyPrice - yearlyMonthly) / monthlyPrice) * 100;
    return Math.round(discount);
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case "starter":
        return <Zap className="h-5 w-5" />;
      case "growth":
        return <Crown className="h-5 w-5" />;
      case "enterprise":
        return <Building className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getPlanColor = (slug: string) => {
    switch (slug) {
      case "starter":
        return "border-blue-200 hover:border-blue-300";
      case "growth":
        return "border-purple-200 hover:border-purple-300 ring-2 ring-purple-100";
      case "enterprise":
        return "border-orange-200 hover:border-orange-300";
      default:
        return "border-gray-200 hover:border-gray-300";
    }
  };

  if (isLoadingPlans) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground">Loading pricing plans...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted rounded-t-lg"></CardHeader>
              <CardContent className="h-48 bg-muted/50"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Choose Your Plan
        </h2>
        <p className="text-muted-foreground">
          Select the perfect plan to power your restaurant's success
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <Tabs
          value={data.billingCycle}
          onValueChange={(value) =>
            updateData({ billingCycle: value as "monthly" | "yearly" })
          }
          className="w-auto"
        >
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="monthly" className="relative">
              Monthly
            </TabsTrigger>
            <TabsTrigger value="yearly" className="relative">
              Yearly
              <Badge
                variant="secondary"
                className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              >
                Save 20%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <RadioGroup
        value={data.selectedPlanId}
        onValueChange={(value) => updateData({ selectedPlanId: value })}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {plans.map((plan) => {
          const displayPrice = getDisplayPrice(plan);
          const yearlyDiscount = getYearlyDiscount(
            plan.monthly_price,
            plan.yearly_price,
          );

          return (
            <div key={plan.id} className="relative">
              <RadioGroupItem
                value={plan.id}
                id={plan.id}
                className="sr-only"
              />
              <Label
                htmlFor={plan.id}
                className={`block cursor-pointer transition-all duration-200 ${getPlanColor(plan.slug)}`}
              >
                <Card
                  className={`relative h-full transition-all duration-200 hover:shadow-lg ${
                    data.selectedPlanId === plan.id
                      ? "ring-2 ring-primary shadow-lg"
                      : ""
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2">
                    <div className="flex items-center justify-center mb-3">
                      {getPlanIcon(plan.slug)}
                    </div>
                    <CardTitle className="text-xl font-bold">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-sm h-12 flex items-center justify-center">
                      {plan.description}
                    </CardDescription>

                    <div className="space-y-2 pt-4">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold text-foreground">
                          ${formatPrice(displayPrice)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /month
                        </span>
                      </div>

                      {data.billingCycle === "yearly" &&
                        plan.yearly_price &&
                        yearlyDiscount > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            Save {yearlyDiscount}% annually
                          </div>
                        )}

                      {data.billingCycle === "monthly" && (
                        <div className="text-xs text-muted-foreground">
                          Billed monthly
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/50">
                      <div className="space-y-2 text-xs text-muted-foreground">
                        {plan.max_tables && (
                          <div className="flex justify-between">
                            <span>Tables:</span>
                            <span className="font-medium">
                              {plan.max_tables}
                            </span>
                          </div>
                        )}
                        {plan.max_bookings_per_month && (
                          <div className="flex justify-between">
                            <span>Bookings/month:</span>
                            <span className="font-medium">
                              {plan.max_bookings_per_month.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {plan.max_staff_accounts && (
                          <div className="flex justify-between">
                            <span>Staff accounts:</span>
                            <span className="font-medium">
                              {plan.max_staff_accounts}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={
                        data.selectedPlanId === plan.id ? "default" : "outline"
                      }
                      className="w-full mt-6 h-11"
                      onClick={() => updateData({ selectedPlanId: plan.id })}
                    >
                      {data.selectedPlanId === plan.id ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Selected
                        </>
                      ) : (
                        "Select Plan"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Billing Information
          </CardTitle>
          <CardDescription>
            Your subscription will begin after restaurant setup is complete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-medium">14-day free trial included</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No payment required during setup. Billing starts after your trial
              period ends.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
