import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailTemplates, COMMON_PLACEHOLDERS, previewTemplate } from '@/hooks/useEmailTemplates';
import { toast } from 'sonner';
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Copy,
  Send,
  Eye,
  FileText,
  Zap,
} from 'lucide-react';

interface EmailTemplatesProps {
  tenantId: string;
}

/**
 * EmailTemplates Component
 * 
 * Email template manager with:
 * - Template library organized by category
 * - Create/Edit templates with placeholder support
 * - Preview with sample data
 * - Send test emails
 * - Duplicate templates
 * - Pre-built templates for common scenarios
 */
export function EmailTemplates({ tenantId }: EmailTemplatesProps) {
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<any>(null);
  const [sendingTemplate, setSendingTemplate] = useState<any>(null);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    category: 'custom' as 'confirmation' | 'quote' | 'reminder' | 'thank_you' | 'custom',
  });

  // Send test email state
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  const {
    templates,
    templatesByCategory,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    sendEmail,
    isCreating,
    isUpdating,
    isSending,
  } = useEmailTemplates(tenantId);

  // Sample data for preview
  const sampleData = {
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    customer_phone: '(555) 123-4567',
    order_number: 'ORD-12345',
    event_name: 'Corporate Luncheon',
    event_date: 'November 15, 2025',
    event_time: '12:00 PM',
    venue_address: '123 Main St, City, State 12345',
    package_name: 'Executive Package',
    guest_count: '50',
    total_amount: '$2,500.00',
    amount_due: '$1,250.00',
    restaurant_name: 'Blunari Restaurant',
    contact_phone: '(555) 987-6543',
    contact_email: 'catering@restaurant.com',
    quote_expires_date: 'October 30, 2025',
    payment_link: 'https://app.blunari.ai/payment/abc123',
    feedback_link: 'https://app.blunari.ai/feedback/abc123',
    review_link: 'https://google.com/review/abc123',
  };

  // Handle create new template
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      subject: '',
      body_html: '',
      body_text: '',
      category: 'custom',
    });
    setShowTemplateDialog(true);
  };

  // Handle edit template
  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || '',
      category: template.category,
    });
    setShowTemplateDialog(true);
  };

  // Handle save template
  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body_html) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingTemplate) {
      updateTemplate({
        templateId: editingTemplate.id,
        updates: templateForm,
      });
    } else {
      createTemplate(templateForm);
    }

    setShowTemplateDialog(false);
  };

  // Handle preview template
  const handlePreview = (template: any) => {
    setPreviewingTemplate(template);
    setShowPreviewDialog(true);
  };

  // Handle send test email
  const handleSendTest = (template: any) => {
    setSendingTemplate(template);
    setTestEmailRecipient('');
    setShowSendDialog(true);
  };

  // Handle confirm send test
  const handleConfirmSendTest = () => {
    if (!testEmailRecipient) {
      toast.error('Please enter a recipient email');
      return;
    }

    sendEmail({
      to: testEmailRecipient,
      templateId: sendingTemplate.id,
      templateData: sampleData,
    });

    setShowSendDialog(false);
  };

  // Insert placeholder at cursor (simplified)
  const insertPlaceholder = (placeholder: string) => {
    setTemplateForm({
      ...templateForm,
      body_html: templateForm.body_html + `{{${placeholder}}}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Create and manage reusable email templates with placeholders
              </CardDescription>
            </div>
            <Button onClick={handleCreateTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Templates by Category */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({templates.length})</TabsTrigger>
          <TabsTrigger value="confirmation">
            Confirmation ({templatesByCategory.confirmation?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="quote">
            Quote ({templatesByCategory.quote?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reminder">
            Reminder ({templatesByCategory.reminder?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="thank_you">
            Thank You ({templatesByCategory.thank_you?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="custom">
            Custom ({templatesByCategory.custom?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TemplateGrid
            templates={templates}
            isLoading={isLoading}
            onEdit={handleEditTemplate}
            onDelete={deleteTemplate}
            onDuplicate={duplicateTemplate}
            onPreview={handlePreview}
            onSendTest={handleSendTest}
          />
        </TabsContent>

        {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
          <TabsContent key={category} value={category}>
            <TemplateGrid
              templates={categoryTemplates || []}
              isLoading={isLoading}
              onEdit={handleEditTemplate}
              onDelete={deleteTemplate}
              onDuplicate={duplicateTemplate}
              onPreview={handlePreview}
              onSendTest={handleSendTest}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Template Editor Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Use placeholders like {`{{customer_name}}`} for dynamic content
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-6 py-4">
            {/* Editor Form */}
            <div className="col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Order Confirmation"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={templateForm.category}
                    onValueChange={(value: any) => setTemplateForm({ ...templateForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmation">Confirmation</SelectItem>
                      <SelectItem value="quote">Quote</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="thank_you">Thank You</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Your Catering Order Confirmation - {{order_number}}"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_html">Email Body (HTML) *</Label>
                <Textarea
                  id="body_html"
                  placeholder="Write your email template here. Use {{placeholder}} for dynamic content."
                  value={templateForm.body_html}
                  onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_text">Plain Text Version (Optional)</Label>
                <Textarea
                  id="body_text"
                  placeholder="Plain text version for email clients that don't support HTML"
                  value={templateForm.body_text}
                  onChange={(e) => setTemplateForm({ ...templateForm, body_text: e.target.value })}
                  rows={8}
                />
              </div>
            </div>

            {/* Placeholder Sidebar */}
            <div className="col-span-1">
              <div className="sticky top-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Available Placeholders
                </h3>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {Object.entries(COMMON_PLACEHOLDERS).map(([key, label]) => (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertPlaceholder(key)}
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        {label}
                        <code className="ml-auto text-[10px] text-muted-foreground">
                          {`{{${key}}}`}
                        </code>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview with sample data
            </DialogDescription>
          </DialogHeader>
          {previewingTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <p className="text-sm font-medium mt-1">
                  {previewTemplate(previewingTemplate, sampleData).split('\n')[0]}
                </p>
              </div>
              <div>
                <Label>Body</Label>
                <ScrollArea className="h-[500px] mt-2 p-4 border rounded-lg bg-muted/50">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: previewTemplate(previewingTemplate, sampleData) 
                    }}
                  />
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Test Email Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email with sample data to verify the template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-recipient">Recipient Email *</Label>
              <Input
                id="test-recipient"
                type="email"
                placeholder="test@example.com"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
              />
            </div>
            {sendingTemplate && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Template: {sendingTemplate.name}</p>
                <p className="text-muted-foreground">
                  This will send with sample data for testing purposes
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSendTest} disabled={isSending}>
              {isSending ? 'Sending...' : 'Send Test Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * TemplateGrid Component
 * Displays templates in a grid layout
 */
function TemplateGrid({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  onSendTest,
}: {
  templates: any[];
  isLoading: boolean;
  onEdit: (template: any) => void;
  onDelete: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onPreview: (template: any) => void;
  onSendTest: (template: any) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
          <p className="text-muted-foreground text-center">
            Create your first email template to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.is_default && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            <CardDescription className="line-clamp-2">
              {template.subject}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {template.placeholders.slice(0, 3).map((placeholder: string) => (
                <Badge key={placeholder} variant="outline" className="text-xs">
                  {placeholder}
                </Badge>
              ))}
              {template.placeholders.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.placeholders.length - 3} more
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onPreview(template)}
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(template)}
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(template.id)}
              >
                <Copy className="w-3 h-3" />
              </Button>
              {!template.is_default && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(template.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => onSendTest(template)}
            >
              <Send className="w-3 h-3 mr-2" />
              Send Test
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
