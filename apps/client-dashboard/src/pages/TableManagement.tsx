import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/hooks/useTenant";
import { useTableManagement, Table } from "@/hooks/useTableManagement";
import FloorPlanManager from "@/components/tables/FloorPlanManager";
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
} from "lucide-react";

const TableManagement: React.FC = () => {
  const { tenant } = useTenant();
  const [viewMode, setViewMode] = useState<"grid" | "floor" | "3d">("floor");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
      <div className="space-y-6">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Table Management
                </h1>
                <p className="text-white/70">
                  Manage your restaurant floor plan and table status
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-white/80 font-medium">{tables.length} Tables Active</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <Users className="w-3 h-3 text-white/60" />
                <span className="text-white/80 font-medium">{tables.reduce((acc, t) => acc + t.capacity, 0)} Total Seats</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
              <Button
                variant={viewMode === "floor" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("floor")}
                className={
                  viewMode === "floor" 
                    ? "h-8 px-4 rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                    : "h-8 px-4 rounded-lg transition-all duration-200 text-white/70 hover:text-white hover:bg-white/10"
                }
              >
                <Eye className="h-3 w-3 mr-2" />
                Floor Plan
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={
                  viewMode === "grid" 
                    ? "h-8 px-4 rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                    : "h-8 px-4 rounded-lg transition-all duration-200 text-white/70 hover:text-white hover:bg-white/10"
                }
              >
                <LayoutGrid className="h-3 w-3 mr-2" />
                Grid View
              </Button>
            </div>
            
            {/* Action Button */}
            <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-lg">
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
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-200">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{tableStats.total}</div>
                <div className="text-sm text-white/60 font-medium">
                  Total Tables
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-200">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {tableStats.available}
                </div>
                <div className="text-sm text-white/60 font-medium">Available</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-200">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {tableStats.occupied}
                </div>
                <div className="text-sm text-white/60 font-medium">Occupied</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-200">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center mx-auto">
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {tableStats.reserved}
                </div>
                <div className="text-sm text-white/60 font-medium">Reserved</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-200">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto">
                  <Settings className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {tableStats.maintenance}
                </div>
                <div className="text-sm text-white/60 font-medium">Maintenance</div>
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
        {viewMode === "floor" ? (
          <FloorPlanView
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            getStatusColor={getStatusColor}
            getTableIcon={getTableIcon}
          />
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
    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          Restaurant Floor Plan
        </CardTitle>
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

export default TableManagement;

