import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  LineChart,
  Receipt,
  CreditCard,
  Banknote,
  Coins,
  Wallet,
  Building,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Share2,
  Printer,
  Mail,
  Clock,
  Users,
  Package,
  ShoppingCart,
  Percent,
  Activity,
  Zap,
  Award,
  Flag,
  BookOpen,
  FolderOpen,
  Archive,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Loader2,
} from "lucide-react";

// Financial reporting interfaces
export interface FinancialReport {
  id: string;
  tenant_id: string;
  report_type: FinancialReportType;
  title: string;
  description?: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  generated_by: string;
  status: "draft" | "final" | "approved" | "archived";
  data: FinancialReportData;
  summary: FinancialSummary;
  created_at: string;
  updated_at: string;
}

export type FinancialReportType = 
  | "profit_loss"
  | "balance_sheet"
  | "cash_flow"
  | "sales_summary"
  | "expense_report"
  | "tax_report"
  | "budget_variance"
  | "inventory_valuation"
  | "cost_analysis"
  | "custom";

export interface FinancialReportData {
  revenue: RevenueBreakdown;
  expenses: ExpenseBreakdown;
  profitability: ProfitabilityMetrics;
  cash_flow: CashFlowData;
  assets_liabilities: BalanceSheetData;
  tax_info: TaxInformation;
  budget_comparison: BudgetComparison;
}

export interface RevenueBreakdown {
  total_revenue: number;
  revenue_by_category: Array<{
    category: string;
    amount: number;
    percentage: number;
    growth: number;
  }>;
  revenue_by_channel: Array<{
    channel: string;
    amount: number;
    percentage: number;
    commission_fees?: number;
  }>;
  revenue_by_time: Array<{
    period: string;
    amount: number;
    orders_count: number;
  }>;
  discounts_applied: number;
  refunds_issued: number;
  net_revenue: number;
}

export interface ExpenseBreakdown {
  total_expenses: number;
  expense_categories: Array<{
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    variance_percentage: number;
  }>;
  fixed_costs: number;
  variable_costs: number;
  one_time_expenses: number;
  recurring_expenses: number;
  expense_trends: Array<{
    period: string;
    amount: number;
    category: string;
  }>;
}

export interface ProfitabilityMetrics {
  gross_profit: number;
  gross_profit_margin: number;
  operating_profit: number;
  operating_profit_margin: number;
  net_profit: number;
  net_profit_margin: number;
  ebitda: number;
  ebitda_margin: number;
  cost_of_goods_sold: number;
  cogs_percentage: number;
}

export interface CashFlowData {
  opening_balance: number;
  closing_balance: number;
  net_cash_flow: number;
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  cash_flow_by_period: Array<{
    period: string;
    inflow: number;
    outflow: number;
    net_flow: number;
    balance: number;
  }>;
}

export interface BalanceSheetData {
  assets: {
    current_assets: number;
    fixed_assets: number;
    total_assets: number;
  };
  liabilities: {
    current_liabilities: number;
    long_term_liabilities: number;
    total_liabilities: number;
  };
  equity: {
    retained_earnings: number;
    total_equity: number;
  };
}

export interface TaxInformation {
  tax_period: string;
  gross_receipts: number;
  deductible_expenses: number;
  taxable_income: number;
  estimated_tax: number;
  tax_rate: number;
  quarterly_payments: Array<{
    quarter: string;
    amount: number;
    due_date: string;
    paid: boolean;
  }>;
}

export interface BudgetComparison {
  budget_period: string;
  total_budgeted_revenue: number;
  actual_revenue: number;
  revenue_variance: number;
  total_budgeted_expenses: number;
  actual_expenses: number;
  expense_variance: number;
  variance_analysis: Array<{
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    explanation?: string;
  }>;
}

export interface FinancialSummary {
  key_metrics: Array<{
    metric: string;
    value: number;
    format: "currency" | "percentage" | "number";
    trend: "positive" | "negative" | "neutral";
  }>;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

export interface TaxDocument {
  id: string;
  document_type: "1099" | "sales_tax" | "income_tax" | "payroll_tax" | "other";
  title: string;
  tax_period: string;
  amount: number;
  due_date: string;
  status: "pending" | "filed" | "paid" | "overdue";
  file_path?: string;
  created_at: string;
}

export interface BudgetPlan {
  id: string;
  name: string;
  fiscal_year: string;
  categories: Array<{
    category: string;
    budgeted_amount: number;
    spent_to_date: number;
    remaining: number;
    percentage_used: number;
  }>;
  total_budget: number;
  total_spent: number;
  variance: number;
  status: "active" | "completed" | "revised";
  created_at: string;
  updated_at: string;
}

// Mock data for financial reporting
const mockRevenueBreakdown: RevenueBreakdown = {
  total_revenue: 127580,
  revenue_by_category: [
    { category: "Food Sales", amount: 89506, percentage: 70.2, growth: 8.5 },
    { category: "Beverage Sales", amount: 25516, percentage: 20.0, growth: 12.3 },
    { category: "Catering", amount: 8942, percentage: 7.0, growth: 15.7 },
    { category: "Merchandise", amount: 3616, percentage: 2.8, growth: -2.1 },
  ],
  revenue_by_channel: [
    { channel: "Dine-in", amount: 76548, percentage: 60.0, commission_fees: 0 },
    { channel: "Takeaway", amount: 31895, percentage: 25.0, commission_fees: 0 },
    { channel: "Delivery", amount: 19137, percentage: 15.0, commission_fees: 1914 },
  ],
  revenue_by_time: [
    { period: "Week 1", amount: 31895, orders_count: 712 },
    { period: "Week 2", amount: 34567, orders_count: 789 },
    { period: "Week 3", amount: 29876, orders_count: 658 },
    { period: "Week 4", amount: 31242, orders_count: 698 },
  ],
  discounts_applied: 3847,
  refunds_issued: 1205,
  net_revenue: 122528,
};

const mockExpenseBreakdown: ExpenseBreakdown = {
  total_expenses: 98750,
  expense_categories: [
    { category: "Food Costs", budgeted: 38000, actual: 39240, variance: 1240, variance_percentage: 3.3 },
    { category: "Labor Costs", budgeted: 28000, actual: 26850, variance: -1150, variance_percentage: -4.1 },
    { category: "Rent & Utilities", budgeted: 12000, actual: 11890, variance: -110, variance_percentage: -0.9 },
    { category: "Marketing", budgeted: 5000, actual: 6200, variance: 1200, variance_percentage: 24.0 },
    { category: "Equipment & Maintenance", budgeted: 3500, actual: 4180, variance: 680, variance_percentage: 19.4 },
    { category: "Insurance", budgeted: 2800, actual: 2750, variance: -50, variance_percentage: -1.8 },
    { category: "Other Expenses", budgeted: 8500, actual: 7640, variance: -860, variance_percentage: -10.1 },
  ],
  fixed_costs: 26640,
  variable_costs: 72110,
  one_time_expenses: 4180,
  recurring_expenses: 94570,
  expense_trends: [
    { period: "Jan", amount: 22450, category: "Total" },
    { period: "Feb", amount: 24120, category: "Total" },
    { period: "Mar", amount: 25680, category: "Total" },
    { period: "Apr", amount: 26500, category: "Total" },
  ],
};

const mockProfitabilityMetrics: ProfitabilityMetrics = {
  gross_profit: 83288,
  gross_profit_margin: 65.3,
  operating_profit: 28778,
  operating_profit_margin: 22.6,
  net_profit: 23528,
  net_profit_margin: 18.4,
  ebitda: 32450,
  ebitda_margin: 25.4,
  cost_of_goods_sold: 44292,
  cogs_percentage: 34.7,
};

const mockCashFlowData: CashFlowData = {
  opening_balance: 45680,
  closing_balance: 58920,
  net_cash_flow: 13240,
  operating_cash_flow: 18760,
  investing_cash_flow: -3200,
  financing_cash_flow: -2320,
  cash_flow_by_period: [
    { period: "Week 1", inflow: 31895, outflow: 24680, net_flow: 7215, balance: 52895 },
    { period: "Week 2", inflow: 34567, outflow: 26890, net_flow: 7677, balance: 60572 },
    { period: "Week 3", inflow: 29876, outflow: 28450, net_flow: 1426, balance: 61998 },
    { period: "Week 4", inflow: 31242, outflow: 25320, net_flow: 5922, balance: 67920 },
  ],
};

const mockTaxDocuments: TaxDocument[] = [
  {
    id: "1",
    document_type: "sales_tax",
    title: "September 2025 Sales Tax Return",
    tax_period: "September 2025",
    amount: 7654,
    due_date: "2025-10-20",
    status: "pending",
    created_at: "2025-09-01T00:00:00Z",
  },
  {
    id: "2",
    document_type: "payroll_tax",
    title: "Q3 2025 Payroll Tax Filing",
    tax_period: "Q3 2025",
    amount: 12450,
    due_date: "2025-10-31",
    status: "filed",
    created_at: "2025-07-01T00:00:00Z",
  },
];

const mockBudgetPlan: BudgetPlan = {
  id: "budget-2025",
  name: "FY 2025 Operating Budget",
  fiscal_year: "2025",
  categories: [
    { category: "Food Costs", budgeted_amount: 456000, spent_to_date: 342000, remaining: 114000, percentage_used: 75 },
    { category: "Labor", budgeted_amount: 336000, spent_to_date: 268800, remaining: 67200, percentage_used: 80 },
    { category: "Rent & Utilities", budgeted_amount: 144000, spent_to_date: 108000, remaining: 36000, percentage_used: 75 },
    { category: "Marketing", budgeted_amount: 60000, spent_to_date: 52800, remaining: 7200, percentage_used: 88 },
    { category: "Equipment", budgeted_amount: 42000, spent_to_date: 31500, remaining: 10500, percentage_used: 75 },
  ],
  total_budget: 1038000,
  total_spent: 803100,
  variance: -234900,
  status: "active",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-09-04T00:00:00Z",
};

const reportTypes = [
  { value: "profit_loss", label: "Profit & Loss Statement" },
  { value: "cash_flow", label: "Cash Flow Statement" },
  { value: "balance_sheet", label: "Balance Sheet" },
  { value: "sales_summary", label: "Sales Summary Report" },
  { value: "expense_report", label: "Expense Analysis Report" },
  { value: "tax_report", label: "Tax Preparation Report" },
  { value: "budget_variance", label: "Budget vs Actual Report" },
];

const FinancialReporting: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [revenueData] = useState<RevenueBreakdown>(mockRevenueBreakdown);
  const [expenseData] = useState<ExpenseBreakdown>(mockExpenseBreakdown);
  const [profitabilityData] = useState<ProfitabilityMetrics>(mockProfitabilityMetrics);
  const [cashFlowData] = useState<CashFlowData>(mockCashFlowData);
  const [taxDocuments] = useState<TaxDocument[]>(mockTaxDocuments);
  const [budgetPlan] = useState<BudgetPlan>(mockBudgetPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // Form states
  const [reportForm, setReportForm] = useState({
    report_type: "profit_loss",
    period_start: "",
    period_end: "",
    include_comparisons: true,
    include_charts: true,
    format: "pdf",
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-red-600";
    if (variance < 0) return "text-green-600";
    return "text-gray-600";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "filed":
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Report Generated",
        description: `Your ${reportTypes.find(t => t.value === reportForm.report_type)?.label} has been generated successfully.`,
      });
      
      setShowGenerateDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Reporting</h1>
          <p className="text-muted-foreground">
            Comprehensive financial reports and business performance analysis
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="current_quarter">Current Quarter</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="current_year">Current Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </motion.div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(revenueData.total_revenue)}
                </p>
                <p className="text-xs text-green-600">+8.5% vs last period</p>
              </div>
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(expenseData.total_expenses)}
                </p>
                <p className="text-xs text-red-600">+3.2% vs last period</p>
              </div>
              <Receipt className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(profitabilityData.net_profit)}
                </p>
                <p className="text-xs text-green-600">
                  {profitabilityData.net_profit_margin}% margin
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Flow</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(cashFlowData.net_cash_flow)}
                </p>
                <p className="text-xs text-purple-600">Monthly net flow</p>
              </div>
              <Wallet className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="profitability">P&L</TabsTrigger>
          <TabsTrigger value="cash_flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="tax_budget">Tax & Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-green-500" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueData.revenue_by_category.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{category.category}</span>
                        <span className="text-sm font-semibold">
                          {formatCurrency(category.amount)}
                        </span>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{category.percentage}% of total</span>
                        <span className="text-green-600">{formatPercentage(category.growth)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-red-500" />
                  Expense Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expenseData.expense_categories.slice(0, 4).map((expense) => (
                    <div key={expense.category} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{expense.category}</p>
                        <p className="text-xs text-muted-foreground">
                          Budget: {formatCurrency(expense.budgeted)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(expense.actual)}</p>
                        <p className={`text-xs ${getVarianceColor(expense.variance)}`}>
                          {formatPercentage(expense.variance_percentage)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Profitability Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gross Profit</span>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(profitabilityData.gross_profit)}</p>
                      <p className="text-xs text-muted-foreground">
                        {profitabilityData.gross_profit_margin}% margin
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Operating Profit</span>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(profitabilityData.operating_profit)}</p>
                      <p className="text-xs text-muted-foreground">
                        {profitabilityData.operating_profit_margin}% margin
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Net Profit</span>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(profitabilityData.net_profit)}
                      </p>
                      <p className="text-xs text-green-600">
                        {profitabilityData.net_profit_margin}% margin
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.revenue_by_channel.map((channel) => (
                    <div key={channel.channel} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{channel.channel}</span>
                        <span className="font-semibold">{formatCurrency(channel.amount)}</span>
                      </div>
                      <Progress value={channel.percentage} className="h-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{channel.percentage}% of total</span>
                        {channel.commission_fees > 0 && (
                          <span>Fees: {formatCurrency(channel.commission_fees)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Adjustments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gross Revenue</span>
                    <span className="font-semibold">{formatCurrency(revenueData.total_revenue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">Discounts Applied</span>
                    <span>-{formatCurrency(revenueData.discounts_applied)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">Refunds Issued</span>
                    <span>-{formatCurrency(revenueData.refunds_issued)}</span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Net Revenue</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(revenueData.net_revenue)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          {/* Expense Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenseData.expense_categories.map((expense) => (
                  <div key={expense.category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{expense.category}</span>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(expense.actual)}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          / {formatCurrency(expense.budgeted)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Progress 
                        value={Math.min((expense.actual / expense.budgeted) * 100, 100)} 
                        className="h-3" 
                      />
                      {expense.actual > expense.budgeted && (
                        <div className="absolute top-0 left-0 h-3 bg-red-500 rounded-full opacity-30" 
                             style={{ width: `${Math.min((expense.actual / expense.budgeted) * 100, 100)}%` }} 
                        />
                      )}
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {((expense.actual / expense.budgeted) * 100).toFixed(1)}% of budget
                      </span>
                      <span className={getVarianceColor(expense.variance)}>
                        {expense.variance > 0 ? '+' : ''}{formatCurrency(expense.variance)} 
                        ({formatPercentage(expense.variance_percentage)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability" className="space-y-6">
          {/* Profit & Loss Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-lg font-semibold border-b pb-2">
                  <span>Revenue</span>
                  <span className="text-green-600">{formatCurrency(revenueData.net_revenue)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Cost of Goods Sold</span>
                  <span className="text-red-600">
                    -{formatCurrency(profitabilityData.cost_of_goods_sold)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center font-semibold border-b pb-2">
                  <span>Gross Profit</span>
                  <span className="text-green-600">
                    {formatCurrency(profitabilityData.gross_profit)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Operating Expenses</span>
                  <span className="text-red-600">
                    -{formatCurrency(expenseData.total_expenses - profitabilityData.cost_of_goods_sold)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center font-semibold border-b pb-2">
                  <span>Operating Profit</span>
                  <span className="text-green-600">
                    {formatCurrency(profitabilityData.operating_profit)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Net Profit</span>
                  <span className="text-green-600">
                    {formatCurrency(profitabilityData.net_profit)}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Gross Margin</p>
                    <p className="font-semibold">{profitabilityData.gross_profit_margin}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Operating Margin</p>
                    <p className="font-semibold">{profitabilityData.operating_profit_margin}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Net Margin</p>
                    <p className="font-semibold">{profitabilityData.net_profit_margin}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash_flow" className="space-y-6">
          {/* Cash Flow Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Cash Flow Summary</h4>
                  
                  <div className="flex justify-between items-center">
                    <span>Opening Balance</span>
                    <span className="font-semibold">{formatCurrency(cashFlowData.opening_balance)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-green-600">
                    <span>Operating Cash Flow</span>
                    <span>+{formatCurrency(cashFlowData.operating_cash_flow)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-red-600">
                    <span>Investing Cash Flow</span>
                    <span>{formatCurrency(cashFlowData.investing_cash_flow)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-red-600">
                    <span>Financing Cash Flow</span>
                    <span>{formatCurrency(cashFlowData.financing_cash_flow)}</span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center font-bold">
                      <span>Closing Balance</span>
                      <span className="text-green-600">
                        {formatCurrency(cashFlowData.closing_balance)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Weekly Cash Flow</h4>
                  {cashFlowData.cash_flow_by_period.map((period) => (
                    <div key={period.period} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{period.period}</span>
                        <span className="font-semibold">
                          {formatCurrency(period.net_flow)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        In: {formatCurrency(period.inflow)} | 
                        Out: {formatCurrency(period.outflow)} | 
                        Balance: {formatCurrency(period.balance)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax_budget" className="space-y-6">
          {/* Tax Documents and Budget Tracking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Tax Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {taxDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(doc.due_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {formatCurrency(doc.amount)}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeColor(doc.status)}>
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Budget Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Budget Utilization</p>
                    <p className="text-2xl font-bold">
                      {((budgetPlan.total_spent / budgetPlan.total_budget) * 100).toFixed(1)}%
                    </p>
                    <Progress 
                      value={(budgetPlan.total_spent / budgetPlan.total_budget) * 100} 
                      className="h-2 mt-2" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Budget</p>
                      <p className="font-semibold">{formatCurrency(budgetPlan.total_budget)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Spent to Date</p>
                      <p className="font-semibold">{formatCurrency(budgetPlan.total_spent)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {budgetPlan.categories.slice(0, 3).map((category) => (
                      <div key={category.category} className="text-sm">
                        <div className="flex justify-between items-center">
                          <span>{category.category}</span>
                          <span>{category.percentage_used}%</span>
                        </div>
                        <Progress value={category.percentage_used} className="h-1 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Generate Report Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Financial Report</DialogTitle>
            <DialogDescription>
              Create a comprehensive financial report for your business
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report_type">Report Type</Label>
              <Select 
                value={reportForm.report_type} 
                onValueChange={(value) => setReportForm(prev => ({ ...prev, report_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_start">Period Start</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={reportForm.period_start}
                  onChange={(e) => setReportForm(prev => ({ ...prev, period_start: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_end">Period End</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={reportForm.period_end}
                  onChange={(e) => setReportForm(prev => ({ ...prev, period_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Report Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={reportForm.include_comparisons}
                    onCheckedChange={(checked) => setReportForm(prev => ({ 
                      ...prev, 
                      include_comparisons: checked 
                    }))}
                  />
                  <span className="text-sm">Include period comparisons</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={reportForm.include_charts}
                    onCheckedChange={(checked) => setReportForm(prev => ({ 
                      ...prev, 
                      include_charts: checked 
                    }))}
                  />
                  <span className="text-sm">Include charts and graphs</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select 
                value={reportForm.format} 
                onValueChange={(value) => setReportForm(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                  <SelectItem value="csv">CSV Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateReport}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialReporting;
