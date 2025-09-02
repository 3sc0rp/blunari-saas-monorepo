import React, { useEffect } from "react";
import { useCateringData, useCateringAnalytics } from "@/hooks/useCateringData";
import { useTenant } from "@/hooks/useTenant";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat, Package, TrendingUp } from "lucide-react";

export const CateringTest: React.FC = () => {
  const { tenant } = useTenant();
  const { packages, loading, error, createOrder, refetch } = useCateringData(
    tenant?.id,
  );
  const { analytics, loading: analyticsLoading } = useCateringAnalytics(
    tenant?.id,
  );

  const testCreateOrder = async () => {
    if (!tenant?.id) return;

    try {
      await createOrder({
        event_name: "Test Corporate Event",
        event_date: "2025-01-15",
        event_start_time: "12:00",
        event_end_time: "14:00",
        guest_count: 25,
        service_type: "delivery",
        contact_name: "Test Customer",
        contact_email: "test@example.com",
        contact_phone: "+1234567890",
        venue_name: "Test Venue",
        venue_address: "123 Test St, Test City",
        special_instructions:
          "This is a test order created by the catering test component",
        dietary_requirements: ["vegetarian", "gluten_free"],
      });

      alert("Test order created successfully!");
      refetch(); // Refresh the packages
    } catch (err) {
      console.error("Test order failed:", err);
      alert(`Test order failed: ${err}`);
    }
  };

  if (!tenant) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p>No tenant found. Please ensure you're properly logged in.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Catering System Test</h2>
        <Badge variant="outline">Tenant: {tenant.name}</Badge>
      </div>

      {/* Packages Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catering Packages
          </CardTitle>
          <CardDescription>
            Testing catering packages retrieval from database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading packages...
            </div>
          ) : error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded-md">
              <strong>Error:</strong> {error}
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="space-y-4">
              <p className="text-green-600 font-medium">
                ✅ Success! Found {packages.length} catering packages
              </p>
              {packages.map((pkg) => (
                <div key={pkg.id} className="border p-4 rounded-md">
                  <h3 className="font-semibold">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pkg.description}
                  </p>
                  <p className="text-sm">
                    ${pkg.price_per_person}/person • Min: {pkg.min_guests}{" "}
                    guests
                  </p>
                  {pkg.popular && (
                    <Badge variant="secondary" className="mt-2">
                      Popular
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-yellow-600 p-4 bg-yellow-50 rounded-md">
              <strong>Info:</strong> No catering packages found. Tables exist
              but no data yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Order Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Test Order Creation
          </CardTitle>
          <CardDescription>
            Test creating a catering order in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testCreateOrder} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create Test Order"
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This will create a test catering order to verify database
            functionality
          </p>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Catering Analytics
          </CardTitle>
          <CardDescription>
            Testing analytics view from catering_order_metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading analytics...
            </div>
          ) : analytics && analytics.length > 0 ? (
            <div className="space-y-2">
              <p className="text-green-600 font-medium">
                ✅ Analytics working! Found {analytics.length} months of data
              </p>
              {analytics.slice(0, 3).map((month: any, index: number) => (
                <div
                  key={index}
                  className="text-sm border-l-4 border-blue-400 pl-3"
                >
                  <strong>{month.month}:</strong> {month.total_orders} orders, $
                  {month.total_revenue || 0} revenue
                </div>
              ))}
            </div>
          ) : (
            <p className="text-yellow-600">
              No analytics data yet - create some orders first!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            ✅ <strong>Migration Applied:</strong> Catering tables are now
            available
          </p>
          <p>
            🔧 <strong>Hook Updated:</strong> Type assertions removed, using
            real database queries
          </p>
          <p>
            📊 <strong>To Add Data:</strong> Use the admin dashboard or create
            packages via SQL
          </p>
          <p>
            🧪 <strong>Testing:</strong> Use the "Create Test Order" button
            above
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
