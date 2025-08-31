import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/hooks/useTenant';
import { useTableManagement, Table } from '@/hooks/useTableManagement';
import { FloorPlan3DManager } from '@/components/tables/FloorPlan3D';
import FloorPlanManager from '@/components/tables/FloorPlanManager';
import FloorPlanViewer3D from '@/components/tables/FloorPlanViewer3D';
import FloorPlanViewer2D from '@/components/tables/FloorPlanViewer2D';
import { 
  Grid3X3, 
  Plus, 
  Users, 
  Clock, 
  Settings,
  Eye,
  EyeOff,
  Utensils,
  Coffee,
  Move3D,
  LayoutGrid
} from 'lucide-react';

const TableManagement: React.FC = () => {
  const { tenant } = useTenant();
  const [viewMode, setViewMode] = useState<'grid' | 'floor' | '3d'>('floor');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Fetch real table data from database
  const { tables, isLoading, updateTable } = useTableManagement(tenant?.id);

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return 'bg-success text-success-foreground';
      case 'occupied':
        return 'bg-destructive text-destructive-foreground';
      case 'reserved':
        return 'bg-warning text-warning-foreground';
      case 'maintenance':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTableIcon = (tableType: Table['table_type']) => {
    switch (tableType) {
      case 'bar':
        return Coffee;
      case 'booth':
        return Utensils;
      default:
        return Grid3X3;
    }
  };

  const tableStats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    maintenance: tables.filter(t => t.status === 'maintenance').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Table Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant floor plan and table status
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'floor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('floor')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Floor Plan
          </Button>
          <Button
            variant={viewMode === '3d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('3d')}
          >
            <Move3D className="h-4 w-4 mr-2" />
            3D View
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid View
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </div>
      </motion.div>

      {/* Table Statistics */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{tableStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Tables</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{tableStats.available}</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{tableStats.occupied}</div>
                <div className="text-sm text-muted-foreground">Occupied</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{tableStats.reserved}</div>
                <div className="text-sm text-muted-foreground">Reserved</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{tableStats.maintenance}</div>
                <div className="text-sm text-muted-foreground">Maintenance</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Table View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {viewMode === 'floor' ? (
          <FloorPlanView 
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            getStatusColor={getStatusColor}
            getTableIcon={getTableIcon}
          />
        ) : viewMode === '3d' ? (
          <div className="space-y-6">
            <FloorPlanManager />
            <FloorPlanViewer3D />
            <details className="mt-4">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                View 2D Preview (Fallback)
              </summary>
              <div className="mt-2">
                <FloorPlanViewer2D />
              </div>
            </details>
          </div>
        ) : (
          <GridView 
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            getStatusColor={getStatusColor}
            getTableIcon={getTableIcon}
          />
        )}
      </motion.div>
    </div>
  );
};

// Floor Plan View Component
const FloorPlanView: React.FC<{
  tables: Table[];
  selectedTable: string | null;
  onSelectTable: (id: string | null) => void;
  getStatusColor: (status: Table['status']) => string;
  getTableIcon: (type: Table['table_type']) => any;
}> = ({ tables, selectedTable, onSelectTable, getStatusColor, getTableIcon }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Restaurant Floor Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-muted/20 rounded-lg p-8 min-h-[500px] border-2 border-dashed border-border">
          {tables.map((table) => {
            const TableIcon = getTableIcon(table.table_type);
            const isSelected = selectedTable === table.id;
            
            return (
              <div
                key={table.id}
                className={`
                  absolute w-20 h-20 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${getStatusColor(table.status)}
                  ${isSelected ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'}
                `}
                style={{
                  left: table.position.x,
                  top: table.position.y,
                }}
                onClick={() => onSelectTable(isSelected ? null : table.id)}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <TableIcon className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">{table.name}</span>
                  <span className="text-xs opacity-75">({table.capacity})</span>
                </div>
              </div>
            );
          })}
          
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-card p-4 rounded-lg border shadow-sm">
            <h4 className="font-medium mb-2">Status Legend</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-destructive"></div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-warning"></div>
                <span>Reserved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-muted"></div>
                <span>Maintenance</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Selected Table Info */}
        {selectedTable && (
          <div className="mt-4">
            <SelectedTableInfo 
              table={tables.find(t => t.id === selectedTable)!}
              onClose={() => onSelectTable(null)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Grid View Component
const GridView: React.FC<{
  tables: Table[];
  selectedTable: string | null;
  onSelectTable: (id: string | null) => void;
  getStatusColor: (status: Table['status']) => string;
  getTableIcon: (type: Table['table_type']) => any;
}> = ({ tables, selectedTable, onSelectTable, getStatusColor, getTableIcon }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tables.map((table) => {
        const TableIcon = getTableIcon(table.table_type);
        const isSelected = selectedTable === table.id;
        
        return (
          <Card
            key={table.id}
            className={`cursor-pointer transition-all duration-200 ${
              isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
            }`}
            onClick={() => onSelectTable(isSelected ? null : table.id)}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TableIcon className="h-5 w-5" />
                  <span className="font-medium">{table.name}</span>
                </div>
                <Badge className={getStatusColor(table.status)}>
                  {table.status}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity:</span>
                  <span>{table.capacity} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{table.table_type}</span>
                </div>
                
                {table.current_booking && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Guest:</span>
                      <span>{table.current_booking.guest_name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Party:</span>
                      <span>{table.current_booking.party_size}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Time Left:</span>
                      <span>{table.current_booking.time_remaining}min</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Selected Table Info Component
const SelectedTableInfo: React.FC<{
  table: Table;
  onClose: () => void;
}> = ({ table, onClose }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>{table.name}</span>
            <Badge className={
              table.status === 'available' ? 'bg-success text-success-foreground' :
              table.status === 'occupied' ? 'bg-destructive text-destructive-foreground' :
              table.status === 'reserved' ? 'bg-warning text-warning-foreground' :
              'bg-muted text-muted-foreground'
            }>
              {table.status}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Capacity</label>
              <p className="text-lg">{table.capacity} guests</p>
            </div>
            <div>
              <label className="text-sm font-medium">Table Type</label>
              <p className="text-lg capitalize">{table.table_type}</p>
            </div>
          </div>
          
          {table.current_booking && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Current Booking</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Guest:</span>
                  <p>{table.current_booking.guest_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Party Size:</span>
                  <p>{table.current_booking.party_size}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time Remaining:</span>
                  <p>{table.current_booking.time_remaining} minutes</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button size="sm" variant="outline">
              Edit Table
            </Button>
            {table.status === 'available' && (
              <Button size="sm">
                Make Reservation
              </Button>
            )}
            {table.status === 'occupied' && (
              <Button size="sm" variant="destructive">
                Clear Table
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TableManagement;