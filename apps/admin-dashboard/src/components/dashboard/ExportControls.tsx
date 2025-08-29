import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileJson, FileSpreadsheet, Settings } from 'lucide-react';
import { useDataExport } from '@/hooks/useDataExport';

interface ExportControlsProps {
  dateRange?: { from: Date; to: Date } | null;
  disabled?: boolean;
  className?: string;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  dateRange,
  disabled = false,
  className
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeMetrics: true,
    includeTenants: true,
    includeBookings: true,
    includeAnalytics: true
  });
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  
  const { exportDashboardData } = useDataExport();

  const handleQuickExport = async (format: 'csv' | 'json') => {
    await exportDashboardData({
      format,
      dateRange: dateRange || undefined,
      includeMetrics: true
    });
  };

  const handleCustomExport = async () => {
    await exportDashboardData({
      format: selectedFormat,
      dateRange: dateRange || undefined,
      includeMetrics: exportOptions.includeMetrics
    });
    setIsDialogOpen(false);
  };

  const getDateRangeLabel = () => {
    if (!dateRange) return 'All Time';
    return `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={className}
            aria-label="Export dashboard data"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <div className="text-sm font-medium">Quick Export</div>
            <div className="text-xs text-muted-foreground">
              Export data for: <Badge variant="outline" className="ml-1">{getDateRangeLabel()}</Badge>
            </div>
          </div>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => handleQuickExport('csv')}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">Export as CSV</div>
              <div className="text-xs text-muted-foreground">
                Spreadsheet format for analysis
              </div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleQuickExport('json')}
            className="cursor-pointer"
          >
            <FileJson className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">Export as JSON</div>
              <div className="text-xs text-muted-foreground">
                Structured data for APIs
              </div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setIsDialogOpen(true)}
            className="cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">Custom Export</div>
              <div className="text-xs text-muted-foreground">
                Choose what to include
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Export Options</DialogTitle>
            <DialogDescription>
              Choose the data to include in your export for {getDateRangeLabel()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Export Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={selectedFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFormat('csv')}
                  className="flex-1"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant={selectedFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFormat('json')}
                  className="flex-1"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Include Data</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metrics"
                    checked={exportOptions.includeMetrics}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeMetrics: !!checked }))
                    }
                  />
                  <Label htmlFor="metrics" className="text-sm">
                    Dashboard Metrics
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tenants"
                    checked={exportOptions.includeTenants}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeTenants: !!checked }))
                    }
                  />
                  <Label htmlFor="tenants" className="text-sm">
                    Restaurant Data
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bookings"
                    checked={exportOptions.includeBookings}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeBookings: !!checked }))
                    }
                  />
                  <Label htmlFor="bookings" className="text-sm">
                    Booking Records
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="analytics"
                    checked={exportOptions.includeAnalytics}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeAnalytics: !!checked }))
                    }
                  />
                  <Label htmlFor="analytics" className="text-sm">
                    Analytics Summary
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};