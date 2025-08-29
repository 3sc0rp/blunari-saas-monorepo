import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmailTemplate } from '@/types/settings';
import { Mail, Code, Eye, Save, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  onSave: (template: EmailTemplate) => void;
  onTest?: (template: EmailTemplate) => void;
}

export function EmailTemplateEditor({ template, onSave, onTest }: EmailTemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate>(template);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onSave(editedTemplate);
      toast({
        title: "Template Saved",
        description: "Email template has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save email template.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      onTest?.(editedTemplate);
      toast({
        title: "Test Email Sent",
        description: "Test email has been sent to your email address.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to send test email.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getCategoryColor = (category: EmailTemplate['category']) => {
    switch (category) {
      case 'booking':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'authentication':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'notifications':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'marketing':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const renderPreview = () => {
    if (previewMode === 'html') {
      return (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: editedTemplate.htmlContent }}
        />
      );
    } else {
      return (
        <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">
          {editedTemplate.textContent}
        </pre>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Edit Email Template</h2>
          <div className="flex items-center gap-2">
            <Badge className={getCategoryColor(editedTemplate.category)}>
              {editedTemplate.category}
            </Badge>
            <Badge variant="outline">v{editedTemplate.version}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            <TestTube className="h-4 w-4 mr-2" />
            {isTesting ? 'Testing...' : 'Send Test'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Template Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={editedTemplate.name}
                    onChange={(e) => setEditedTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={editedTemplate.category} 
                    onValueChange={(value: EmailTemplate['category']) => 
                      setEditedTemplate(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                      <SelectItem value="notifications">Notifications</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editedTemplate.description}
                  onChange={(e) => setEditedTemplate(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={editedTemplate.subject}
                  onChange={(e) => setEditedTemplate(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Use {{variable}} for dynamic content"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={editedTemplate.enabled}
                  onCheckedChange={(checked) => setEditedTemplate(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="enabled">Template Enabled</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Template Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="htmlContent">HTML Content</Label>
                <Textarea
                  id="htmlContent"
                  value={editedTemplate.htmlContent}
                  onChange={(e) => setEditedTemplate(prev => ({ ...prev, htmlContent: e.target.value }))}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder="Enter HTML email template..."
                />
              </div>

              <div>
                <Label htmlFor="textContent">Text Content (Fallback)</Label>
                <Textarea
                  id="textContent"
                  value={editedTemplate.textContent}
                  onChange={(e) => setEditedTemplate(prev => ({ ...prev, textContent: e.target.value }))}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder="Enter plain text version..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Template Variables</CardTitle>
              <CardDescription>
                Available variables for this template. Use in content as {'{{variable_key}}'}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {editedTemplate.variables.map((variable, index) => (
                  <div key={variable.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                        {'{{'}{variable.key}{'}}'}
                      </code>
                      <p className="text-sm text-muted-foreground mt-1">{variable.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {variable.required && <Badge variant="secondary">Required</Badge>}
                      {variable.defaultValue && (
                        <span className="text-xs text-muted-foreground">
                          Default: {variable.defaultValue}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Template Preview
                </span>
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === 'html' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('html')}
                  >
                    HTML
                  </Button>
                  <Button
                    variant={previewMode === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('text')}
                  >
                    Text
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Subject Preview:</Label>
                  <div className="bg-muted p-2 rounded text-sm font-medium">
                    {editedTemplate.subject}
                  </div>
                </div>
                
                <div>
                  <Label>Content Preview:</Label>
                  <div className="border rounded-lg p-4 min-h-[400px] bg-background">
                    {renderPreview()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <div className="font-medium">{new Date(editedTemplate.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>
                  <div className="font-medium">{new Date(editedTemplate.updatedAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>
                  <div className="font-medium">v{editedTemplate.version}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={editedTemplate.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {editedTemplate.enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}