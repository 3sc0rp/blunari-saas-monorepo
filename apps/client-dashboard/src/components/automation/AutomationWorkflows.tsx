import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  Clock, 
  Users, 
  Mail, 
  MessageSquare, 
  Bell,
  Calendar,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  Settings,
  Plus,
  ArrowRight,
  Filter,
  BarChart3,
  Smartphone,
  Star,
  Target,
  Repeat,
  GitBranch,
  Timer,
  Activity
} from 'lucide-react';

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'operations' | 'customer_service' | 'inventory' | 'staff' | 'analytics';
  trigger: {
    type: 'time' | 'event' | 'condition' | 'manual';
    config: Record<string, any>;
  };
  actions: WorkflowAction[];
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runsCount: number;
  successRate: number;
  estimatedROI: number;
  createdAt: Date;
}

interface WorkflowAction {
  id: string;
  type: 'email' | 'sms' | 'notification' | 'update_data' | 'create_task' | 'api_call' | 'condition' | 'delay';
  config: Record<string, any>;
  enabled: boolean;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'simple' | 'intermediate' | 'advanced';
  estimatedSetupTime: number;
  potentialROI: string;
  triggers: string[];
  actions: string[];
}

const automationWorkflows: AutomationWorkflow[] = [
  {
    id: 'welcome-email-sequence',
    name: 'New Customer Welcome Sequence',
    description: 'Automated email sequence for new customer onboarding and engagement',
    category: 'marketing',
    trigger: {
      type: 'event',
      config: { event: 'customer_signup', delay: 0 }
    },
    actions: [
      {
        id: 'welcome-email',
        type: 'email',
        config: { 
          template: 'welcome_email',
          delay: 0,
          subject: 'Welcome to {{restaurant_name}}!',
          personalizeContent: true
        },
        enabled: true
      },
      {
        id: 'loyalty-signup',
        type: 'update_data',
        config: { 
          action: 'add_to_loyalty_program',
          points: 100
        },
        enabled: true
      },
      {
        id: 'follow-up-email',
        type: 'email',
        config: { 
          template: 'first_order_incentive',
          delay: 3,
          subject: 'Your first order is on us! 20% off',
          includeDiscount: true,
          discountPercent: 20
        },
        enabled: true
      }
    ],
    isActive: true,
    lastRun: new Date(Date.now() - 3600000),
    nextRun: new Date(Date.now() + 1800000),
    runsCount: 1247,
    successRate: 94.2,
    estimatedROI: 2340,
    createdAt: new Date(Date.now() - 86400000 * 30)
  },
  {
    id: 'low-inventory-alert',
    name: 'Low Inventory Alert System',
    description: 'Automated alerts when inventory items fall below threshold levels',
    category: 'operations',
    trigger: {
      type: 'condition',
      config: { 
        condition: 'inventory_level < threshold',
        checkFrequency: 'hourly'
      }
    },
    actions: [
      {
        id: 'manager-notification',
        type: 'notification',
        config: { 
          recipient: 'managers',
          priority: 'high',
          message: 'Low inventory alert: {{item_name}} ({{current_level}}/{{threshold}})'
        },
        enabled: true
      },
      {
        id: 'supplier-email',
        type: 'email',
        config: { 
          recipient: 'suppliers',
          template: 'reorder_request',
          autoReorder: false
        },
        enabled: true
      },
      {
        id: 'create-purchase-order',
        type: 'create_task',
        config: { 
          taskType: 'purchase_order',
          assignTo: 'inventory_manager',
          priority: 'high'
        },
        enabled: false
      }
    ],
    isActive: true,
    lastRun: new Date(Date.now() - 7200000),
    runsCount: 89,
    successRate: 98.9,
    estimatedROI: 5600,
    createdAt: new Date(Date.now() - 86400000 * 45)
  },
  {
    id: 'birthday-campaign',
    name: 'Customer Birthday Campaign',
    description: 'Personalized birthday offers and messages for loyalty customers',
    category: 'marketing',
    trigger: {
      type: 'time',
      config: { 
        schedule: 'daily',
        time: '09:00',
        daysInAdvance: 3
      }
    },
    actions: [
      {
        id: 'birthday-email',
        type: 'email',
        config: { 
          template: 'birthday_offer',
          subject: 'Happy Birthday from {{restaurant_name}}! 🎂',
          offerType: 'free_dessert',
          validityDays: 14
        },
        enabled: true
      },
      {
        id: 'birthday-sms',
        type: 'sms',
        config: { 
          message: 'Happy Birthday! Enjoy a free dessert on us this week. Show this message to redeem.',
          delay: 2
        },
        enabled: true
      },
      {
        id: 'loyalty-bonus',
        type: 'update_data',
        config: { 
          action: 'add_loyalty_points',
          points: 250,
          reason: 'birthday_bonus'
        },
        enabled: true
      }
    ],
    isActive: true,
    lastRun: new Date(Date.now() - 86400000),
    nextRun: new Date(Date.now() + 86400000),
    runsCount: 156,
    successRate: 91.7,
    estimatedROI: 1850,
    createdAt: new Date(Date.now() - 86400000 * 60)
  },
  {
    id: 'shift-reminder-system',
    name: 'Staff Shift Reminder System',
    description: 'Automated reminders for upcoming shifts and schedule changes',
    category: 'staff',
    trigger: {
      type: 'time',
      config: { 
        schedule: 'custom',
        hoursBeforeShift: 24
      }
    },
    actions: [
      {
        id: 'shift-reminder-sms',
        type: 'sms',
        config: { 
          message: 'Reminder: You have a {{shift_type}} shift tomorrow from {{start_time}} to {{end_time}}',
          hoursInAdvance: 24
        },
        enabled: true
      },
      {
        id: 'shift-confirmation',
        type: 'sms',
        config: { 
          message: 'Please reply YES to confirm your shift in 2 hours: {{shift_details}}',
          hoursInAdvance: 2,
          requireConfirmation: true
        },
        enabled: true
      },
      {
        id: 'manager-alert',
        type: 'notification',
        config: { 
          condition: 'no_confirmation_received',
          recipient: 'shift_managers',
          message: '{{staff_name}} has not confirmed their shift: {{shift_details}}'
        },
        enabled: true
      }
    ],
    isActive: true,
    lastRun: new Date(Date.now() - 3600000),
    nextRun: new Date(Date.now() + 86400000),
    runsCount: 892,
    successRate: 96.8,
    estimatedROI: 3200,
    createdAt: new Date(Date.now() - 86400000 * 90)
  },
  {
    id: 'review-response-automation',
    name: 'Review Response Automation',
    description: 'Auto-generate and suggest responses to customer reviews',
    category: 'customer_service',
    trigger: {
      type: 'event',
      config: { 
        event: 'new_review_received',
        platforms: ['google', 'yelp', 'tripadvisor']
      }
    },
    actions: [
      {
        id: 'sentiment-analysis',
        type: 'api_call',
        config: { 
          service: 'sentiment_analysis',
          endpoint: '/analyze-review',
          extractKeywords: true
        },
        enabled: true
      },
      {
        id: 'generate-response',
        type: 'api_call',
        config: { 
          service: 'ai_response_generator',
          tone: 'professional_friendly',
          personalizeResponse: true
        },
        enabled: true
      },
      {
        id: 'manager-approval',
        type: 'create_task',
        config: { 
          taskType: 'review_response_approval',
          assignTo: 'customer_service_manager',
          priority: 'medium'
        },
        enabled: true
      }
    ],
    isActive: false,
    runsCount: 234,
    successRate: 87.6,
    estimatedROI: 1200,
    createdAt: new Date(Date.now() - 86400000 * 20)
  },
  {
    id: 'peak-hours-optimization',
    name: 'Peak Hours Staff Optimization',
    description: 'Dynamic staff scheduling based on predicted busy periods',
    category: 'operations',
    trigger: {
      type: 'condition',
      config: { 
        condition: 'predicted_busy_period',
        leadTime: '2_hours',
        confidenceThreshold: 80
      }
    },
    actions: [
      {
        id: 'call-in-staff',
        type: 'sms',
        config: { 
          recipients: 'on_call_staff',
          message: 'We are expecting a busy period. Are you available to come in? Reply YES to confirm.',
          maxStaffToCall: 3
        },
        enabled: true
      },
      {
        id: 'adjust-kitchen-prep',
        type: 'notification',
        config: { 
          recipient: 'kitchen_manager',
          message: 'Busy period predicted. Consider increasing prep for popular items: {{items_list}}'
        },
        enabled: true
      },
      {
        id: 'enable-wait-alert',
        type: 'update_data',
        config: { 
          action: 'enable_wait_time_alerts',
          threshold: 15
        },
        enabled: true
      }
    ],
    isActive: true,
    lastRun: new Date(Date.now() - 14400000),
    runsCount: 67,
    successRate: 94.0,
    estimatedROI: 4200,
    createdAt: new Date(Date.now() - 86400000 * 15)
  }
];

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'abandoned-cart-recovery',
    name: 'Abandoned Cart Recovery',
    description: 'Re-engage customers who left items in their cart without completing the order',
    category: 'marketing',
    complexity: 'intermediate',
    estimatedSetupTime: 45,
    potentialROI: '15-25% increase in conversions',
    triggers: ['Cart abandonment after 30 minutes'],
    actions: ['Email reminder', 'SMS follow-up', 'Discount offer', 'Push notification']
  },
  {
    id: 'vip-customer-recognition',
    name: 'VIP Customer Recognition',
    description: 'Automatically identify and reward high-value customers',
    category: 'customer_service',
    complexity: 'advanced',
    estimatedSetupTime: 90,
    potentialROI: '20-30% increase in customer lifetime value',
    triggers: ['Spending threshold reached', 'Visit frequency milestone'],
    actions: ['VIP status upgrade', 'Personal manager assignment', 'Exclusive offers', 'Priority seating']
  },
  {
    id: 'food-waste-reduction',
    name: 'Food Waste Reduction',
    description: 'Track and reduce food waste through predictive analytics',
    category: 'operations',
    complexity: 'advanced',
    estimatedSetupTime: 120,
    potentialROI: '10-15% reduction in food costs',
    triggers: ['End of day inventory', 'Expiration date alerts', 'Prep surplus detection'],
    actions: ['Discount expired items', 'Staff meal offers', 'Donation coordination', 'Supplier adjustments']
  },
  {
    id: 'social-media-automation',
    name: 'Social Media Automation',
    description: 'Automate social media posts based on restaurant activities',
    category: 'marketing',
    complexity: 'simple',
    estimatedSetupTime: 30,
    potentialROI: '5-10% increase in social engagement',
    triggers: ['New menu items', 'Special events', 'Customer milestones'],
    actions: ['Auto-post to Instagram', 'Facebook updates', 'Twitter announcements', 'Story creation']
  }
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'marketing': return 'bg-purple-100 text-purple-800';
    case 'operations': return 'bg-blue-100 text-blue-800';
    case 'customer_service': return 'bg-green-100 text-green-800';
    case 'inventory': return 'bg-orange-100 text-orange-800';
    case 'staff': return 'bg-indigo-100 text-indigo-800';
    case 'analytics': return 'bg-pink-100 text-pink-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case 'simple': return 'bg-green-100 text-green-800';
    case 'intermediate': return 'bg-yellow-100 text-yellow-800';
    case 'advanced': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTriggerIcon = (type: string) => {
  switch (type) {
    case 'time': return Clock;
    case 'event': return Activity;
    case 'condition': return Filter;
    case 'manual': return PlayCircle;
    default: return Zap;
  }
};

export default function AutomationWorkflows() {
  const [workflows, setWorkflows] = useState(automationWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreating, setIsCreating] = useState(false);

  const activeWorkflows = workflows.filter(w => w.isActive);
  const totalRuns = workflows.reduce((sum, w) => sum + w.runsCount, 0);
  const avgSuccessRate = workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length;
  const totalROI = workflows.reduce((sum, w) => sum + w.estimatedROI, 0);

  const handleToggleWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(workflow => 
      workflow.id === workflowId 
        ? { ...workflow, isActive: !workflow.isActive }
        : workflow
    ));
  };

  const handleRunWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(workflow => 
      workflow.id === workflowId 
        ? { 
            ...workflow, 
            lastRun: new Date(),
            runsCount: workflow.runsCount + 1
          }
        : workflow
    ));
  };

  const createWorkflowFromTemplate = (template: WorkflowTemplate) => {
    console.log(`Creating workflow from template: ${template.name}`);
    setIsCreating(true);
    // Simulate workflow creation
    setTimeout(() => {
      setIsCreating(false);
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation Workflows</h1>
          <p className="text-muted-foreground">
            Create and manage intelligent automation workflows to optimize your restaurant operations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button className="flex items-center gap-2" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeWorkflows.length}</p>
                <p className="text-xs text-muted-foreground">Active Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Executions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Target className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalROI.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Est. Monthly ROI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => {
              const TriggerIcon = getTriggerIcon(workflow.trigger.type);
              return (
                <Card key={workflow.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedWorkflow(workflow)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <TriggerIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{workflow.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge className={getCategoryColor(workflow.category)}>
                              {workflow.category.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${workflow.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className="text-xs text-muted-foreground">
                                {workflow.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={workflow.isActive}
                        onCheckedChange={() => handleToggleWorkflow(workflow.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription>{workflow.description}</CardDescription>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold">{workflow.runsCount}</p>
                        <p className="text-xs text-muted-foreground">Runs</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{workflow.successRate}%</p>
                        <p className="text-xs text-muted-foreground">Success</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">${workflow.estimatedROI}</p>
                        <p className="text-xs text-muted-foreground">ROI</p>
                      </div>
                    </div>

                    {workflow.lastRun && (
                      <div className="text-xs text-muted-foreground">
                        Last run: {workflow.lastRun.toLocaleString()}
                      </div>
                    )}

                    {workflow.nextRun && workflow.isActive && (
                      <div className="text-xs text-muted-foreground">
                        Next run: {workflow.nextRun.toLocaleString()}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleRunWorkflow(workflow.id);
                      }}>
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Run Now
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                        <Settings className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Active Workflows</h3>
            <div className="grid grid-cols-1 gap-4">
              {activeWorkflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <Zap className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{workflow.name}</h4>
                          <p className="text-sm text-muted-foreground">{workflow.description}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm">
                              Runs: <strong>{workflow.runsCount}</strong>
                            </span>
                            <span className="text-sm">
                              Success: <strong>{workflow.successRate}%</strong>
                            </span>
                            <span className="text-sm">
                              ROI: <strong>${workflow.estimatedROI}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <PauseCircle className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Workflow Templates</h3>
              <Button variant="outline">
                Browse All Templates
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workflowTemplates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge className={getComplexityColor(template.complexity)}>
                        {template.complexity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription>{template.description}</CardDescription>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Setup Time:</span>
                        <span className="font-medium">{template.estimatedSetupTime} min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Potential ROI:</span>
                        <span className="font-medium text-green-600">{template.potentialROI}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Triggers</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.triggers.map((trigger, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Actions</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.actions.map((action, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => createWorkflowFromTemplate(template)}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Timer className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Use Template
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mr-2" />
                  Performance analytics chart would go here
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>ROI Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mr-2" />
                  ROI trends chart would go here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    workflows.reduce((acc, workflow) => {
                      acc[workflow.category] = (acc[workflow.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="capitalize">{category.replace('_', ' ')}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows
                    .filter(w => w.lastRun)
                    .sort((a, b) => (b.lastRun?.getTime() || 0) - (a.lastRun?.getTime() || 0))
                    .slice(0, 5)
                    .map((workflow) => (
                      <div key={workflow.id} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{workflow.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workflow.lastRun?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
