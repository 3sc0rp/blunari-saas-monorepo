import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTwilioSMS, SMS_TEMPLATES, replaceSMSPlaceholders, validatePhoneNumber, formatPhoneNumber } from '@/hooks/useTwilioSMS';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Phone,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface SMSIntegrationProps {
  tenantId: string;
}

/**
 * SMSIntegration Component
 * 
 * SMS sending interface with Twilio integration.
 * Features:
 * - SMS composer with character count
 * - Quick templates
 * - Recipient validation
 * - Cost estimation
 * - Delivery status tracking
 * - SMS history
 * - Stats dashboard
 */
export function SMSIntegration({ tenantId }: SMSIntegrationProps) {
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // SMS form state
  const [smsForm, setSmsForm] = useState({
    recipientPhone: '',
    recipientName: '',
    message: '',
  });

  const {
    smsHistory,
    stats,
    isLoading,
    sendSMS,
    isSending,
    calculateSegments,
    estimateCost,
  } = useTwilioSMS(tenantId);

  // Sample data for template placeholders
  const sampleData = {
    customer_name: 'John Doe',
    order_number: 'ORD-12345',
    event_date: 'November 15, 2025',
    event_time: '12:00 PM',
    venue_address: '123 Main St',
    package_name: 'Executive Package',
    restaurant_name: 'Blunari Restaurant',
    contact_phone: '(555) 987-6543',
    payment_link: 'https://app.blunari.ai/pay/abc123',
    quote_link: 'https://app.blunari.ai/quote/abc123',
    feedback_link: 'https://app.blunari.ai/feedback/abc123',
    event_name: 'Corporate Luncheon',
  };

  // Calculate message stats
  const segments = calculateSegments(smsForm.message);
  const estimatedCost = estimateCost(smsForm.message);
  const charCount = smsForm.message.length;
  const charLimit = segments === 1 ? 160 : 153 * segments;

  // Handle apply template
  const handleApplyTemplate = (templateKey: string) => {
    const template = SMS_TEMPLATES[templateKey as keyof typeof SMS_TEMPLATES];
    if (template) {
      setSmsForm({
        ...smsForm,
        message: replaceSMSPlaceholders(template.message, sampleData),
      });
      setSelectedTemplate(templateKey);
    }
  };

  // Handle send SMS
  const handleSendSMS = () => {
    // Validate phone number
    if (!validatePhoneNumber(smsForm.recipientPhone)) {
      toast.error('Invalid phone number. Use E.164 format (e.g., +12345678900)');
      return;
    }

    if (!smsForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    sendSMS({
      tenantId,
      to: smsForm.recipientPhone,
      message: smsForm.message,
      recipientName: smsForm.recipientName || undefined,
    });

    setShowComposeDialog(false);
    setSmsForm({
      recipientPhone: '',
      recipientName: '',
      message: '',
    });
    setSelectedTemplate('');
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'delivered':
        return { icon: CheckCircle, color: 'text-green-600', label: 'Delivered' };
      case 'sent':
        return { icon: Send, color: 'text-blue-600', label: 'Sent' };
      case 'failed':
      case 'undelivered':
        return { icon: XCircle, color: 'text-red-600', label: 'Failed' };
      case 'queued':
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', label: 'Pending' };
      default:
        return { icon: AlertCircle, color: 'text-gray-600', label: 'Unknown' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.deliveryRate}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segments Used</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSegments}</div>
            <p className="text-xs text-muted-foreground">
              SMS segments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFailed}</div>
            <p className="text-xs text-muted-foreground">
              Delivery failures
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compose Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS Composer
              </CardTitle>
              <CardDescription>
                Send SMS messages to customers via Twilio
              </CardDescription>
            </div>
            <Button onClick={() => setShowComposeDialog(true)}>
              <Send className="w-4 h-4 mr-2" />
              Compose SMS
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Quick Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(SMS_TEMPLATES).map(([key, template]) => (
              <Button
                key={key}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start"
                onClick={() => {
                  handleApplyTemplate(key);
                  setShowComposeDialog(true);
                }}
              >
                <span className="font-semibold mb-1">{template.name}</span>
                <span className="text-xs text-muted-foreground text-left line-clamp-2">
                  {template.message.substring(0, 80)}...
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SMS History */}
      <Card>
        <CardHeader>
          <CardTitle>SMS History</CardTitle>
          <CardDescription>
            Recent SMS messages and delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : smsHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No SMS messages sent yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {smsHistory.map((sms) => {
                  const statusDisplay = getStatusDisplay(sms.status);
                  const StatusIcon = statusDisplay.icon;

                  return (
                    <div
                      key={sms.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {sms.recipient_name || formatPhoneNumber(sms.recipient_phone)}
                          </span>
                          {sms.recipient_name && (
                            <span className="text-xs text-muted-foreground">
                              {formatPhoneNumber(sms.recipient_phone)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              sms.status === 'delivered' ? 'default' :
                              sms.status === 'failed' ? 'destructive' :
                              'secondary'
                            }
                            className="flex items-center gap-1"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusDisplay.label}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {sms.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(sms.created_at).toLocaleString()}</span>
                        <span>{sms.segments} segment{sms.segments > 1 ? 's' : ''}</span>
                        {sms.cost_cents && (
                          <span>${(sms.cost_cents / 100).toFixed(4)}</span>
                        )}
                        {sms.error_message && (
                          <Badge variant="destructive" className="text-xs">
                            {sms.error_message}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose SMS Message</DialogTitle>
            <DialogDescription>
              Send an SMS message via Twilio integration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Recipient Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+12345678900"
                  value={smsForm.recipientPhone}
                  onChange={(e) => setSmsForm({ ...smsForm, recipientPhone: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use E.164 format (e.g., +1 for US)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Recipient Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={smsForm.recipientName}
                  onChange={(e) => setSmsForm({ ...smsForm, recipientName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message *</Label>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    {charCount} / {charLimit} characters
                  </span>
                  <Badge variant={segments > 1 ? 'secondary' : 'outline'}>
                    {segments} segment{segments > 1 ? 's' : ''}
                  </Badge>
                  <span className="font-semibold">
                    ~${estimatedCost.toFixed(4)}
                  </span>
                </div>
              </div>
              <Textarea
                id="message"
                placeholder="Type your SMS message here..."
                value={smsForm.message}
                onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                rows={6}
                maxLength={1600} // Twilio max
              />
            </div>

            {selectedTemplate && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Using template: {SMS_TEMPLATES[selectedTemplate as keyof typeof SMS_TEMPLATES].name}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Edit the message above to customize it for this recipient
                </p>
              </div>
            )}

            {segments > 3 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  This message is quite long ({segments} segments). Consider shortening it to reduce costs.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendSMS} disabled={isSending}>
              {isSending ? 'Sending...' : `Send SMS (~$${estimatedCost.toFixed(4)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
