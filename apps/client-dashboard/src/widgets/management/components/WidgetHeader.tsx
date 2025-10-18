/**
 * WidgetHeader Component
 * Main header with title, widget selector, and action buttons
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  Calendar, 
  ChefHat, 
  AlertCircle, 
  RotateCcw, 
  Save, 
  Loader2 
} from 'lucide-react';
import type { WidgetType } from '../types';
import type { ValidationError } from '../types';

interface WidgetHeaderProps {
  activeWidgetType: WidgetType;
  onWidgetTypeChange: (type: WidgetType) => void;
  hasUnsavedChanges: boolean;
  validationErrors: ValidationError[];
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  activeWidgetType,
  onWidgetTypeChange,
  hasUnsavedChanges,
  validationErrors,
  isSaving,
  onSave,
  onReset,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg" aria-hidden="true">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Widget Management</h1>
          <p className="text-muted-foreground">
            Configure, preview, and deploy your widgets
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && (
          <Badge variant="secondary" className="flex items-center gap-1" aria-live="polite">
            <AlertCircle className="w-3 h-3" />
            Unsaved Changes
          </Badge>
        )}
        
        {/* Widget type selector */}
        <div className="flex items-center gap-2">
          <Label htmlFor="widget-type">Active Widget:</Label>
          <Select 
            value={activeWidgetType} 
            onValueChange={onWidgetTypeChange}
            aria-label="Select widget type"
          >
            <SelectTrigger id="widget-type" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="booking">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  Booking Widget
                </div>
              </SelectItem>
              <SelectItem value="catering">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4" aria-hidden="true" />
                  Catering Widget
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReset}
            aria-label="Reset configuration to defaults (Ctrl+R)"
            title="Reset configuration to defaults (Ctrl+R)"
          >
            <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
            Reset
          </Button>
          <Button 
            size="sm" 
            onClick={onSave}
            disabled={isSaving || validationErrors.length > 0}
            className="min-w-20"
            aria-label={`Save configuration (Ctrl+S)${validationErrors.length > 0 ? ' - Fix validation errors first' : ''}`}
            title={`Save configuration (Ctrl+S)${validationErrors.length > 0 ? ' - Fix validation errors first' : ''}`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" aria-hidden="true" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};