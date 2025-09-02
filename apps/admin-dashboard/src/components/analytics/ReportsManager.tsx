import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Calendar,
  Download,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

export const ReportsManager: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [reportPeriod, setReportPeriod] = useState<string>("last-30-days");

  const availableReports = [
    {
      id: "revenue-summary",
      name: "Revenue Summary",
      description: "Comprehensive revenue analysis with trends",
      icon: TrendingUp,
      category: "Financial",
    },
    {
      id: "tenant-analytics",
      name: "Tenant Analytics",
      description: "Restaurant performance metrics",
      icon: BarChart3,
      category: "Operations",
    },
    {
      id: "booking-patterns",
      name: "Booking Patterns",
      description: "Booking trends and customer behavior",
      icon: Calendar,
      category: "Analytics",
    },
    {
      id: "platform-health",
      name: "Platform Health",
      description: "System performance and reliability metrics",
      icon: Activity,
      category: "Technical",
    },
    {
      id: "user-engagement",
      name: "User Engagement",
      description: "User activity and engagement metrics",
      icon: PieChart,
      category: "Product",
    },
  ];

  const generateReport = (reportId: string) => {
    console.log(`Generating report: ${reportId} for period: ${reportPeriod}`);
    // In a real application, this would trigger report generation
  };

  const recentReports = [
    {
      id: "1",
      name: "Monthly Revenue Report",
      generatedAt: "2024-01-15T10:30:00Z",
      status: "completed",
      type: "revenue-summary",
    },
    {
      id: "2",
      name: "Q4 Tenant Performance",
      generatedAt: "2024-01-14T14:20:00Z",
      status: "completed",
      type: "tenant-analytics",
    },
    {
      id: "3",
      name: "Platform Health Check",
      generatedAt: "2024-01-14T09:15:00Z",
      status: "completed",
      type: "platform-health",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Analytics Reports Manager
          </CardTitle>
          <CardDescription>
            Generate and manage comprehensive analytics reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generate" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate Report</TabsTrigger>
              <TabsTrigger value="recent">Recent Reports</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select Report Type
                    </label>
                    <Select
                      value={selectedReport}
                      onValueChange={setSelectedReport}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a report type" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableReports.map((report) => (
                          <SelectItem key={report.id} value={report.id}>
                            <div className="flex items-center gap-2">
                              <report.icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{report.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {report.category}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Time Period
                    </label>
                    <Select
                      value={reportPeriod}
                      onValueChange={setReportPeriod}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-7-days">Last 7 days</SelectItem>
                        <SelectItem value="last-30-days">
                          Last 30 days
                        </SelectItem>
                        <SelectItem value="last-90-days">
                          Last 90 days
                        </SelectItem>
                        <SelectItem value="last-year">Last year</SelectItem>
                        <SelectItem value="custom">Custom range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => generateReport(selectedReport)}
                    disabled={!selectedReport}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Available Report Types</h4>
                  <div className="space-y-3">
                    {availableReports.map((report) => (
                      <div key={report.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <report.icon className="h-4 w-4 text-primary" />
                            <div>
                              <div className="font-medium text-sm">
                                {report.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {report.description}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {report.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Generated on{" "}
                          {new Date(report.generatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          report.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {report.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No Scheduled Reports
                </h3>
                <p className="text-muted-foreground mb-4">
                  Set up automated report generation to receive regular insights
                </p>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Report
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
