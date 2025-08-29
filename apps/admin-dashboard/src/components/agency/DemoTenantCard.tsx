import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoTenant } from '@/types/agency';
import { Calendar, Eye, Bookmark, ExternalLink, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DemoTenantCardProps {
  demo: DemoTenant;
  onExtend?: (demoId: string) => void;
  onDelete?: (demoId: string) => void;
  onViewDetails?: (demoId: string) => void;
}

export function DemoTenantCard({ demo, onExtend, onDelete, onViewDetails }: DemoTenantCardProps) {
  const getStatusColor = (status: DemoTenant['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Scheduled for Cleanup':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTemplateColor = (template: DemoTenant['template']) => {
    switch (template) {
      case 'Italian':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-400 dark:border-green-800';
      case 'Fine Dining':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/10 dark:text-purple-400 dark:border-purple-800';
      case 'Casual':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-800';
      case 'Coffee Shop':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-800';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/10 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const isExpiringSoon = () => {
    const expiresAt = new Date(demo.expiresAt);
    const now = new Date();
    const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours > 0;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{demo.name}</h3>
            <p className="text-sm text-muted-foreground">{demo.partnerName}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={getTemplateColor(demo.template)} variant="outline">
              {demo.template}
            </Badge>
            <Badge className={getStatusColor(demo.status)}>
              {demo.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span>{demo.views} views</span>
          </div>
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-muted-foreground" />
            <span>{demo.bookings} bookings</span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Expires {formatDistanceToNow(new Date(demo.expiresAt), { addSuffix: true })}</span>
            {isExpiringSoon() && (
              <Clock className="h-4 w-4 text-amber-500" />
            )}
          </div>
          {demo.lastAccessed && (
            <div className="text-muted-foreground">
              Last accessed {formatDistanceToNow(new Date(demo.lastAccessed), { addSuffix: true })}
            </div>
          )}
        </div>

        {demo.notes && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            {demo.notes}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(demo.demoUrl, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Demo
          </Button>
          
          {demo.status === 'Active' && onExtend && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExtend(demo.id)}
            >
              Extend
            </Button>
          )}

          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(demo.id)}
            >
              Details
            </Button>
          )}

          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(demo.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}