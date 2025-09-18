import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/useTenant";
import { useTableManagement, Table } from "@/hooks/useTableManagement";
import { Grid3X3, Plus, Users, Clock, Wrench, CheckCircle2, AlertTriangle } from "lucide-react";

const Tables: React.FC = () => {
  const { tenant } = useTenant();

  const { tables, isLoading, updateTable, addTable, changeStatus, deactivateTable } = useTableManagement(tenant?.id);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Table["status"]>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 200);
    return () => window.clearTimeout(id);
  }, [search]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [newName, setNewName] = useState("T1");
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [newType, setNewType] = useState<Table["table_type"]>("standard");

  const [editData, setEditData] = useState<{ id: string; name: string; capacity: number; table_type: Table["table_type"]; } | null>(null);

  const tableStats = {
    total: tables.length,
    available: tables.filter((t) => t.status === "available").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    reserved: tables.filter((t) => t.status === "reserved").length,
    maintenance: tables.filter((t) => t.status === "maintenance").length,
  };

  const filteredTables = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return tables.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(term);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tables, search, statusFilter]);

  const statusClass = (status: Table["status"]) => {
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

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 font-bold text-foreground tracking-tight">Tables</h1>
          <p className="text-body text-muted-foreground mt-2 max-w-3xl">
            Fully data-driven table management. The booking widget reads from these tables and your business hours.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button className="transition-brand shadow-elev-1" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </div>
      </motion.div>

      {/* Info banner removed */}

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-subtle border-surface-3 hover-scale">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Grid3X3 className="h-5 w-5 text-muted-foreground" />
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-bold text-foreground">{tableStats.total}</div>
            <div className="text-body-sm text-muted-foreground">Total Tables</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-subtle border-surface-3 hover-scale">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-success">{tableStats.available}</div>
            <div className="text-body-sm text-muted-foreground">Available</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-subtle border-surface-3 hover-scale">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-destructive" />
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-destructive">{tableStats.occupied}</div>
            <div className="text-body-sm text-muted-foreground">Occupied</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-subtle border-surface-3 hover-scale">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-warning" />
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-warning">{tableStats.reserved}</div>
            <div className="text-body-sm text-muted-foreground">Reserved</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-subtle border-surface-3 hover-scale">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div className="text-2xl font-bold text-muted-foreground">{tableStats.maintenance}</div>
            <div className="text-body-sm text-muted-foreground">Maintenance</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <Card className="mt-2">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="search">Search</Label>
            <Input id="search" placeholder="Search by name..." value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(v)=>setStatusFilter(v as any)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-muted-foreground">
              <div className="text-h4 mb-2">No tables match your filters</div>
              <p className="text-body-sm mb-4">Try clearing filters or adding a new table.</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={()=>{ setSearch(""); setStatusFilter("all"); }}>Clear Filters</Button>
                <Button onClick={()=>setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredTables.map((table)=> (
          <Card key={table.id} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  <span className="font-medium">{table.name}</span>
                </div>
                <Badge className={statusClass(table.status)}>{table.status}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Capacity:</span><span>{table.capacity} guests</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><span className="capitalize">{table.table_type}</span></div>
                {table.current_booking && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Guest:</span><span>{table.current_booking.guest_name}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Party:</span><span>{table.current_booking.party_size}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Time Left:</span><span>{table.current_booking.time_remaining}min</span></div>
                  </div>
                )}
              </div>
              <div className="pt-3 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  {!table.current_booking && (
                    table.status === "maintenance" ? (
                      <Button size="sm" variant="outline" onClick={()=>changeStatus(table.id, "available")}>Set Available</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={()=>changeStatus(table.id, "maintenance")}>Mark Maintenance</Button>
                    )
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={()=>{ setEditData({ id: table.id, name: table.name, capacity: table.capacity, table_type: table.table_type }); setEditOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={()=>deactivateTable(table.id)}>Deactivate</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Table Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>Enter the details for the new table. All fields are required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="table-name">Name</Label>
                <Input id="table-name" value={newName} onChange={(e)=>setNewName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" type="number" value={newCapacity} onChange={(e)=>setNewCapacity(Number(e.target.value||0))} />
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newType} onValueChange={(val)=>setNewType(val as Table["table_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="booth">Booth</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={async()=>{ await addTable({ name: newName, capacity: newCapacity, table_type: newType, position: { x: 100, y: 100 } as any }); setAddOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
            <DialogDescription>Update the table name, capacity, and type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-table-name">Name</Label>
                <Input id="edit-table-name" value={editData?.name||""} onChange={(e)=>setEditData(prev=>prev?{...prev,name:e.target.value}:prev)} />
              </div>
              <div>
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input id="edit-capacity" type="number" value={editData?.capacity??4} onChange={(e)=>setEditData(prev=>prev?{...prev,capacity:Number(e.target.value||0)}:prev)} />
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={editData?.table_type||"standard"} onValueChange={(val)=>setEditData(prev=>prev?{...prev,table_type: val as Table["table_type"]}:prev)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="booth">Booth</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={async()=>{ if(!editData) return; await updateTable({ tableId: editData.id, updates: { name: editData.name, capacity: editData.capacity, table_type: editData.table_type } as any }); setEditOpen(false); setEditData(null); }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tables;
