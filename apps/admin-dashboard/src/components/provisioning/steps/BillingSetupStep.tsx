import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Zap, Building } from "lucide-react";
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

interface BillingSetupStepProps {
  data: ProvisioningData;
  updateData: (updates: Partial<ProvisioningData>) => void;
}

export function BillingSetupStep({ data, updateData }: BillingSetupStepProps) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        const { data: pricingPlans, error } = await supabase
          .from("pricing_plans")
          .select("*")
          .eq("is_active", true)
          .order("monthly_price");

        if (error) throw error;

        // Transform the data to ensure features is an array
        const transformedPlans = (pricingPlans || []).map((plan) => ({
          ...plan,
          features: Array.isArray(plan.features) ? plan.features : [],
        }));

        setPlans(transformedPlans);
      } catch (error) {
        console.error("Error fetching pricing plans:", error);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPricingPlans();
  }, []);

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2);
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
        return "border-blue-200";
      case "growth":
        return "border-purple-200 ring-2 ring-purple-200";
      case "enterprise":
        return "border-orange-200";
      default:
        return "border-gray-200";
    }
  };

  if (isLoadingPlans) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="h-4 bg-gray-200 rounded w-full"
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Cycle Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Cycle</CardTitle>
          <CardDescription>
            Choose between monthly or yearly billing. Yearly plans include a
            discount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={data.billingCycle}
            onValueChange={(value) =>
              updateData({ billingCycle: value as "monthly" | "yearly" })
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="relative">
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">
                  Save up to 17%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Plan Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Plan</CardTitle>
          <CardDescription>
            Select the plan that best fits your restaurant's needs. You can
            upgrade or downgrade at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.selectedPlanId}
            onValueChange={(value) => updateData({ selectedPlanId: value })}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {plans.map((plan) => {
              const price =
                data.billingCycle === "yearly" && plan.yearly_price
                  ? plan.yearly_price
                  : plan.monthly_price;
              const displayPrice =
                data.billingCycle === "yearly" && plan.yearly_price
                  ? plan.yearly_price / 12
                  : price;
              const yearlyDiscount = plan.yearly_price
                ? getYearlyDiscount(plan.monthly_price, plan.yearly_price)
                : 0;

              return (
                <div key={plan.id} className="relative">
                  <RadioGroupItem
                    value={plan.id}
                    id={plan.id}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={plan.id}
                    className={`block cursor-pointer transition-all duration-200 hover:shadow-lg ${getPlanColor(plan.slug)}`}
                  >
                    <Card
                      className={`relative h-full ${data.selectedPlanId === plan.id ? "ring-2 ring-primary" : ""}`}
                    >
                      {plan.is_popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="text-center pb-2">
                        <div className="flex items-center justify-center mb-2">
                          {getPlanIcon(plan.slug)}
                        </div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {plan.description}
                        </CardDescription>

                        <div className="space-y-1">
                          <div className="text-3xl font-bold">
                            ${formatPrice(displayPrice)}
                            <span className="text-lg font-normal text-muted-foreground">
                              /month
                            </span>
                          </div>
                          {data.billingCycle === "yearly" &&
                            plan.yearly_price && (
                              <div className="text-sm text-muted-foreground">
                                Billed annually ($
                                {formatPrice(plan.yearly_price)}/year)
                                {yearlyDiscount > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="ml-2 text-xs"
                                  >
                                    {yearlyDiscount}% off
                                  </Badge>
                                )}
                              </div>
                            )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t space-y-1 text-sm text-muted-foreground">
                          {plan.max_tables && (
                            <div>Up to {plan.max_tables} tables</div>
                          )}
                          {plan.max_bookings_per_month && (
                            <div>
                              Up to{" "}
                              {plan.max_bookings_per_month.toLocaleString()}{" "}
                              bookings/month
                            </div>
                          )}
                          {plan.max_staff_accounts && (
                            <div>
                              Up to {plan.max_staff_accounts} staff accounts
                            </div>
                          )}
                          {!plan.max_tables && !plan.max_bookings_per_month && (
                            <div>Unlimited usage</div>
                          )}
                        </div>

                        {data.selectedPlanId === plan.id && (
                          <div className="pt-2">
                            <Badge className="w-full justify-center bg-green-100 text-green-800 hover:bg-green-100">
                              <Check className="h-3 w-3 mr-1" />
                              Selected
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Check className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">What happens next?</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  • You'll be redirected to our secure payment processor to
                  enter your payment details
                </p>
                <p>
                  • Your subscription will begin immediately after successful
                  payment
                </p>
                <p>
                  • You can cancel or change your plan at any time from your
                  account settings
                </p>
                <p>
                  • All major credit cards are accepted, and your data is always
                  secure
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
