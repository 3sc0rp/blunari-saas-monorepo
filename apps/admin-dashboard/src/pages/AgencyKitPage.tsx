import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  Zap,
  Download,
  Plus,
  Code,
  Calendar,
  DollarSign,
  Target,
  Star,
  Activity,
  Clock,
  BarChart3,
  Building,
} from "lucide-react";

// Components
import { DemoTenantCard } from "@/components/agency/DemoTenantCard";
import { PartnerCard } from "@/components/agency/PartnerCard";
import { AgencyKitCard } from "@/components/agency/AgencyKitCard";
import { CreateDemoDialog } from "@/components/agency/CreateDemoDialog";
import { IntegrationCodeDialog } from "@/components/agency/IntegrationCodeDialog";

// Data
import {
  mockPartners,
  mockDemoTenants,
  mockAgencyKits,
  mockRevenueAnalytics,
} from "@/data/mockAgencyData";
import { useToast } from "@/hooks/use-toast";

export default function AgencyKitPage() {
  const [createDemoOpen, setCreateDemoOpen] = useState(false);
  const [integrationCodeOpen, setIntegrationCodeOpen] = useState(false);
  const { toast } = useToast();

  const handleDownloadKit = (kitId: string) => {
    const kit = mockAgencyKits.find((k) => k.id === kitId);
    if (kit) {
      toast({
        title: "Download Started",
        description: `${kit.name} is being downloaded.`,
      });
      // Simulate download
      setTimeout(() => {
        toast({
          title: "Download Complete",
          description: `${kit.name} has been downloaded successfully.`,
        });
      }, 2000);
    }
  };

  const handleExtendDemo = (demoId: string) => {
    toast({
      title: "Demo Extended",
      description: "Demo expiration has been extended by 7 days.",
    });
  };

  const handleDeleteDemo = (demoId: string) => {
    toast({
      title: "Demo Deleted",
      description: "Demo tenant has been scheduled for cleanup.",
      variant: "destructive",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate stats
  const totalActiveDemos = mockDemoTenants.filter(
    (d) => d.status === "Active",
  ).length;
  const totalDemoViews = mockDemoTenants.reduce((sum, d) => sum + d.views, 0);
  const totalDemoBookings = mockDemoTenants.reduce(
    (sum, d) => sum + d.bookings,
    0,
  );
  const activePartners = mockPartners.filter(
    (p) => p.status === "Active",
  ).length;

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Agency Kit Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage demo tenants, agency partnerships, and integration tools
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIntegrationCodeOpen(true)}
          >
            <Code className="h-4 w-4 mr-2" />
            Integration Codes
          </Button>
          <Button onClick={() => setCreateDemoOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Demo
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Demos</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveDemos}</div>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Demo Engagement
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDemoViews}</div>
            <p className="text-xs text-muted-foreground">
              Total views across all demos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demo Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDemoBookings}</div>
            <p className="text-xs text-muted-foreground">
              Bookings made in demos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Partners
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePartners}</div>
            <p className="text-xs text-muted-foreground">
              Registered agency partners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="demos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="demos">Demo Tenants</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="kits">Agency Kits</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
        </TabsList>

        {/* Demo Tenants Tab */}
        <TabsContent value="demos" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Demo Tenants
              </h2>
              <p className="text-muted-foreground">
                Manage demo restaurant environments for client presentations
              </p>
            </div>
            <Button onClick={() => setCreateDemoOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Demo
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockDemoTenants.map((demo) => (
              <DemoTenantCard
                key={demo.id}
                demo={demo}
                onExtend={handleExtendDemo}
                onDelete={handleDeleteDemo}
              />
            ))}
          </div>
        </TabsContent>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Agency Partners
              </h2>
              <p className="text-muted-foreground">
                Manage relationships with agency partners and resellers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockPartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        </TabsContent>

        {/* Agency Kits Tab */}
        <TabsContent value="kits" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Agency Kits & Resources
              </h2>
              <p className="text-muted-foreground">
                Download integration tools, documentation, and marketing
                materials
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockAgencyKits.map((kit) => (
              <AgencyKitCard
                key={kit.id}
                kit={kit}
                onDownload={handleDownloadKit}
              />
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Revenue Analytics
            </h2>
            <p className="text-muted-foreground">
              Track partner performance and commission metrics
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Overview - {mockRevenueAnalytics.period}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(mockRevenueAnalytics.totalRevenue)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Revenue
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(mockRevenueAnalytics.commissionPaid)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Commission Paid
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {mockRevenueAnalytics.averageCommissionRate}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Avg Commission
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Top Performing Partners</h4>
                  <div className="space-y-3">
                    {mockRevenueAnalytics.topPartners.map((partner, index) => (
                      <div
                        key={partner.partnerId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{partner.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-green-600">
                            +{partner.growth}%
                          </span>
                          <span className="font-medium">
                            {formatCurrency(partner.revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Conversion Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Demo → Trial</span>
                      <span>
                        {mockRevenueAnalytics.conversionMetrics.demoToTrial}%
                      </span>
                    </div>
                    <Progress
                      value={mockRevenueAnalytics.conversionMetrics.demoToTrial}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Trial → Payment</span>
                      <span>
                        {mockRevenueAnalytics.conversionMetrics.trialToPayment}%
                      </span>
                    </div>
                    <Progress
                      value={
                        mockRevenueAnalytics.conversionMetrics.trialToPayment
                      }
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Conversion</span>
                      <span>
                        {
                          mockRevenueAnalytics.conversionMetrics
                            .overallConversion
                        }
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        mockRevenueAnalytics.conversionMetrics.overallConversion
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Partner Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600 mb-2">
                      4.5
                    </div>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= 4
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Average satisfaction score
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Lifecycle Management Tab */}
        <TabsContent value="lifecycle" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Lifecycle Management
            </h2>
            <p className="text-muted-foreground">
              Monitor demo tenant lifecycle and automated cleanup processes
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Auto-Cleanup Schedule
                </CardTitle>
                <CardDescription>
                  Automated cleanup runs daily to remove expired demos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Next Cleanup Run</p>
                    <p className="text-sm text-muted-foreground">
                      Today at 2:00 AM UTC
                    </p>
                  </div>
                  <Badge variant="outline">Scheduled</Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Cleanup Summary (Last 30 days):
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Demos Cleaned:
                      </span>
                      <div className="font-medium">23</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Storage Freed:
                      </span>
                      <div className="font-medium">1.2 GB</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Demo Health Status
                </CardTitle>
                <CardDescription>
                  Monitor performance and availability of active demos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Demos</span>
                    <Badge variant="secondary">{totalActiveDemos} online</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Response Time</span>
                    <span className="text-sm font-medium">245ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uptime (24h)</span>
                    <span className="text-sm font-medium text-green-600">
                      99.8%
                    </span>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Resource Usage:</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>CPU</span>
                        <span>32%</span>
                      </div>
                      <Progress value={32} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Memory</span>
                        <span>68%</span>
                      </div>
                      <Progress value={68} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateDemoDialog
        open={createDemoOpen}
        onOpenChange={setCreateDemoOpen}
        onSuccess={() => {
          // Refresh demo list
        }}
      />

      <IntegrationCodeDialog
        open={integrationCodeOpen}
        onOpenChange={setIntegrationCodeOpen}
      />
    </div>
  );
}
