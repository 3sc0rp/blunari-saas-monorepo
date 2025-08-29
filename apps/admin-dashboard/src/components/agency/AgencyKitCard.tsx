import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AgencyKit } from '@/types/agency';
import { Download, FileText, Package, Code, Palette, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AgencyKitCardProps {
  kit: AgencyKit;
  onDownload: (kitId: string) => void;
}

export function AgencyKitCard({ kit, onDownload }: AgencyKitCardProps) {
  const getKitIcon = (type: AgencyKit['type']) => {
    switch (type) {
      case 'WordPress Plugin':
        return <Package className="h-5 w-5" />;
      case 'HTML Kit':
        return <Code className="h-5 w-5" />;
      case 'Documentation':
        return <FileText className="h-5 w-5" />;
      case 'Branding Assets':
        return <Palette className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getKitColor = (type: AgencyKit['type']) => {
    switch (type) {
      case 'WordPress Plugin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'HTML Kit':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Documentation':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Branding Assets':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${getKitColor(kit.type)} bg-opacity-20`}>
            {getKitIcon(kit.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{kit.name}</h3>
            <p className="text-sm text-muted-foreground">v{kit.version}</p>
          </div>
          <Badge className={getKitColor(kit.type)}>
            {kit.type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{kit.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">File Size:</span>
            <div className="font-medium">{kit.fileSize}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Downloads:</span>
            <div className="font-medium">{formatNumber(kit.downloadCount)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Updated {formatDistanceToNow(new Date(kit.lastUpdated), { addSuffix: true })}</span>
        </div>

        <Button 
          onClick={() => onDownload(kit.id)}
          className="w-full"
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Download {kit.type}
        </Button>
      </CardContent>
    </Card>
  );
}