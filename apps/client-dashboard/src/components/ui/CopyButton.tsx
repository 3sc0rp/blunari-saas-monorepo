/**
 * CopyButton Component
 * Reusable button with visual feedback for copy-to-clipboard actions
 */
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  value: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showToast?: boolean;
  className?: string;
}

/**
 * Reusable copy-to-clipboard button with visual feedback
 * 
 * @example
 * <CopyButton 
 *   value={email} 
 *   label="Email" 
 *   variant="outline" 
 *   size="sm" 
 * />
 */
export function CopyButton({
  value,
  label,
  variant = 'outline',
  size = 'sm',
  showToast = true,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      if (showToast) {
        toast({
          title: 'Copied!',
          description: `${label || 'Text'} copied to clipboard`,
        });
      }

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn(
        'transition-all duration-200',
        copied && 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100',
        className
      )}
      title={copied ? 'Copied!' : `Copy ${label || 'text'}`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" />
          {size !== 'icon' && <span className="ml-2">Copied!</span>}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {size !== 'icon' && <span className="ml-2">Copy</span>}
        </>
      )}
    </Button>
  );
}

/**
 * Inline copy button that appears next to text
 * 
 * @example
 * <div className="flex items-center gap-2">
 *   <code>{apiKey}</code>
 *   <InlineCopyButton value={apiKey} />
 * </div>
 */
export function InlineCopyButton({
  value,
  label,
  showToast = false, // Don't show toast for inline to reduce noise
}: Omit<CopyButtonProps, 'variant' | 'size' | 'className'>) {
  return (
    <CopyButton
      value={value}
      label={label}
      variant="ghost"
      size="icon"
      showToast={showToast}
      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
    />
  );
}

