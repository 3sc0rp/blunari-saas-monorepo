import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode | LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  dense?: boolean; // smaller padding variant
  inline?: boolean; // render without Card wrapper
  children?: React.ReactNode; // optional extra content (e.g., tips)
}

/**
 * Shared EmptyState component used wherever data is intentionally empty
 * due to real-data-only baseline (no mock/fake seed). Provides consistent UX
 * and encourages hooking up real data integrations.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  description = 'Data will appear once real events are ingested.',
  icon,
  actionLabel,
  onAction,
  className,
  dense,
  inline,
  children,
}) => {
  const IconEl = (() => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as LucideIcon;
    return <IconComp className="h-8 w-8 text-muted-foreground/50" />;
  })();

  const content = (
    <div className={cn('flex flex-col items-center justify-center text-center', dense ? 'py-6' : 'py-10', className)}>
      {IconEl && <div className="mb-4 opacity-60">{IconEl}</div>}
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      {children && <div className="mt-3 w-full max-w-md text-left space-y-2">{children}</div>}
      {actionLabel && onAction && (
        <Button size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (inline) return content;
  return (
    <Card className="border-dashed">
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
};

export default EmptyState;
