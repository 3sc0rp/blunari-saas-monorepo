import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTenant } from "@/hooks/useTenant";
import { useTableManagement, Table } from "@/hooks/useTableManagement";
import { FloorPlan3DManager } from "@/components/tables/FloorPlan3D";
import FloorPlanManager from "@/components/tables/FloorPlanManager";
import FloorPlanViewer3D from "@/components/tables/FloorPlanViewer3D";
import FloorPlanViewer2D from "@/components/tables/FloorPlanViewer2D";
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
  LayoutGrid,
  AlertTriangle,
  CheckCircle2,
  Target,
  Wrench,
  TrendingUp,
  Monitor,
  Info,
  MousePointer,
  RotateCcw,
  ZoomIn,
} from "lucide-react";

const Tables: React.FC = () => {
  const { tenant } = useTenant();
  const [viewMode, setViewMode] = useState<"3d">("3d");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);

  // Fetch real table data from database
  const { tables, isLoading, updateTable } = useTableManagement(tenant?.id);

  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "bg-success text-success-foreground";
      case "occupied":
        return "bg-destructive text-destructive-foreground";
      case "reserved":
        return "bg-warning text-warning-foreground";
      case "maintenance":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTableIcon = (tableType: Table["table_type"]) => {
    switch (tableType) {
      case "bar":
        return Coffee;
      case "booth":
        return Utensils;
      default:
        return Grid3X3;
    }
  };

  const tableStats = {
    total: tables.length,
    available: tables.filter((t) => t.status === "available").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    reserved: tables.filter((t) => t.status === "reserved").length,
    maintenance: tables.filter((t) => t.status === "maintenance").length,
  };

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 font-bold text-foreground tracking-tight">
            Floor Plan Manager
          </h1>
          <p className="text-body text-muted-foreground mt-2 max-w-3xl">
            Visual table management with intelligent positioning and real-time
            status tracking
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("3d")}
            className="transition-brand"
          >
            <Move3D className="h-4 w-4 mr-2" />
            3D Manager
          </Button>
          <Button className="transition-brand shadow-elev-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </div>
      </motion.div>

      {/* Calibration Banner */}
      {!isCalibrated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="border-warning/20 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="flex items-center justify-between w-full">
              <div>
                <strong>Floor plan calibration required</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload and analyze your floor plan to enable accurate table
                  detection and positioning.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCalibrated(true)}
                className="ml-4 flex-shrink-0"
              >
                <Target className="h-4 w-4 mr-2" />
                Calibrate Now
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* KPI Section */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="hover-scale">
              <CardContent className="pt-4">
                <Skeleton className="h-20 w-full" />
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
          <Card className="bg-gradient-subtle border-surface-3 hover-scale">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Grid3X3 className="h-5 w-5 text-muted-foreground" />
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {tableStats.total}
              </div>
              <div className="text-body-sm text-muted-foreground">
                Total Tables
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-subtle border-surface-3 hover-scale">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-success">
                {tableStats.available}
              </div>
              <div className="text-body-sm text-muted-foreground">
                Available
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-subtle border-surface-3 hover-scale">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-destructive" />
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-destructive">
                {tableStats.occupied}
              </div>
              <div className="text-body-sm text-muted-foreground">Occupied</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-subtle border-surface-3 hover-scale">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-warning" />
                <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-warning">
                {tableStats.reserved}
              </div>
              <div className="text-body-sm text-muted-foreground">Reserved</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-subtle border-surface-3 hover-scale">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div className="text-2xl font-bold text-muted-foreground">
                {tableStats.maintenance}
              </div>
              <div className="text-body-sm text-muted-foreground">
                Maintenance
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 3D Floor Plan Manager */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        <FloorPlanManager />

        {/* Enhanced 3D Viewer */}
        <Card className="overflow-hidden border-surface-3 bg-gradient-subtle">
          <CardHeader className="bg-surface-2/50 border-b border-surface-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand/10">
                  <Move3D className="h-5 w-5 text-brand" />
                </div>
                Interactive 3D Preview
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-surface text-muted-foreground"
                >
                  {tables.length} Tables
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-surface text-muted-foreground"
                >
                  Real-time
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            <FloorPlanViewer3D />

            {/* Control Hints Overlay */}
            <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-sm rounded-lg border border-surface-3 p-3 shadow-elev-1">
              <h4 className="font-medium text-body-sm mb-2 text-foreground">
                Controls
              </h4>
              <div className="space-y-1 text-body-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-3 w-3" />
                  <span>Drag to rotate</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-3 w-3" />
                  <span>Scroll to zoom</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3 w-3" />
                  <span>Double-click to reset</span>
                </div>
              </div>
            </div>

            {/* Entity Information Panel */}
            <div className="absolute bottom-4 right-4 bg-surface/90 backdrop-blur-sm rounded-lg border border-surface-3 p-3 shadow-elev-1 max-w-xs">
              <h4 className="font-medium text-body-sm mb-3 text-foreground">
                Table Status
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {tables.slice(0, 4).map((table) => (
                  <TableChip key={table.id} table={table} />
                ))}
              </div>
              {tables.length > 4 && (
                <div className="mt-2 text-body-xs text-muted-foreground text-center">
                  +{tables.length - 4} more tables
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2D Preview */}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <Card className="hover-scale transition-brand">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">2D Floor Plan Preview</span>
                  </div>
                  <Badge variant="outline">Optional</Badge>
                </div>
              </CardContent>
            </Card>
          </summary>
          <div className="mt-4 animate-fade-in">
            <FloorPlanViewer2D />
          </div>
        </details>
      </motion.div>
    </div>
  );
};

// Floor Plan View Component
const FloorPlanView: React.FC<{
  tables: Table[];
  selectedTable: string | null;
  onSelectTable: (id: string | null) => void;
  getStatusColor: (status: Table["status"]) => string;
  getTableIcon: (type: Table["table_type"]) => any;
}> = ({
  tables,
  selectedTable,
  onSelectTable,
  getStatusColor,
  getTableIcon,
}) => {
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
                  ${isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"}
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
              table={tables.find((t) => t.id === selectedTable)!}
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
  getStatusColor: (status: Table["status"]) => string;
  getTableIcon: (type: Table["table_type"]) => any;
}> = ({
  tables,
  selectedTable,
  onSelectTable,
  getStatusColor,
  getTableIcon,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tables.map((table) => {
        const TableIcon = getTableIcon(table.table_type);
        const isSelected = selectedTable === table.id;

        return (
          <Card
            key={table.id}
            className={`cursor-pointer transition-all duration-200 ${
              isSelected ? "ring-2 ring-primary" : "hover:shadow-md"
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
            <Badge
              className={
                table.status === "available"
                  ? "bg-success text-success-foreground"
                  : table.status === "occupied"
                    ? "bg-destructive text-destructive-foreground"
                    : table.status === "reserved"
                      ? "bg-warning text-warning-foreground"
                      : "bg-muted text-muted-foreground"
              }
            >
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
            {table.status === "available" && (
              <Button size="sm">Make Reservation</Button>
            )}
            {table.status === "occupied" && (
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

// Table Chip Component for Entity Display
const TableChip: React.FC<{ table: Table }> = ({ table }) => {
  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "bg-success/10 text-success border-success/20";
      case "occupied":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "reserved":
        return "bg-warning/10 text-warning border-warning/20";
      case "maintenance":
        return "bg-muted/10 text-muted-foreground border-muted/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getTableIcon = (tableType: Table["table_type"]) => {
    switch (tableType) {
      case "bar":
        return Coffee;
      case "booth":
        return Utensils;
      default:
        return Grid3X3;
    }
  };

  const TableIcon = getTableIcon(table.table_type);

  return (
    <div
      className={`p-2 rounded-lg border transition-brand hover-scale ${getStatusColor(table.status)}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <TableIcon className="h-3 w-3" />
        <span className="font-medium text-body-xs">{table.name}</span>
      </div>
      <div className="flex items-center justify-between text-body-xs">
        <span>{table.capacity} seats</span>
        <div
          className={`w-2 h-2 rounded-full ${
            table.status === "available"
              ? "bg-success"
              : table.status === "occupied"
                ? "bg-destructive"
                : table.status === "reserved"
                  ? "bg-warning"
                  : "bg-muted-foreground"
          }`}
        />
      </div>
    </div>
  );
};

export default Tables;
