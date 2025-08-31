import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PageHeaderProps {
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  }>;
  tabs?: Array<{
    value: string;
    label: string;
  }>;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  breadcrumb?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  primaryAction,
  secondaryActions = [],
  tabs,
  activeTab,
  onTabChange,
  breadcrumb
}) => {
  return (
    <div className="section-spacing">
      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="mb-4">
          {breadcrumb}
        </div>
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-body text-muted-foreground mt-2 max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {(primaryAction || secondaryActions.length > 0) && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Secondary Actions */}
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                className="transition-brand"
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ))}

            {/* Primary Action */}
            {primaryAction && (
              <Button
                variant={primaryAction.variant || 'default'}
                onClick={primaryAction.onClick}
                className="transition-brand shadow-elev-1"
              >
                {primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-2" />}
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid w-auto grid-cols-auto gap-1 h-auto p-1 bg-surface-2">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground px-4 py-2.5 text-body-sm font-medium transition-brand"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
};

export default PageHeader;