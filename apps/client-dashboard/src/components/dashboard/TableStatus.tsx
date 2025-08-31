import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Loader2 } from "lucide-react";
import { useTableManagement } from "@/hooks/useTableManagement";
import { useTenant } from "@/hooks/useTenant";
import { Skeleton } from "@/components/ui/skeleton";

const TableStatus = () => {
  const { tenant } = useTenant();
  const { tables, isLoading, updateTable } = useTableManagement(tenant?.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success/10 text-success border-success/20';
      case 'occupied':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'reserved':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'cleaning':
      case 'maintenance':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Table Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Table Status</CardTitle>
      </CardHeader>
      <CardContent>
        {tables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tables configured. Please add tables in Table Management.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className="p-4 border-2 transition-all duration-300 hover:shadow-medium">
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{table.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {table.capacity} seats
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(table.status)}
                  >
                    {getStatusText(table.status)}
                  </Badge>
                </div>

                {table.current_booking && (
                  <div className="space-y-2 mb-3">
                    <div className="text-sm font-medium">{table.current_booking.guest_name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Party of {table.current_booking.party_size} • {table.current_booking.time_remaining}min left
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {table.status === 'available' && (
                    <Button size="sm" variant="outline" className="flex-1">
                      Reserve
                    </Button>
                  )}
                  {table.status === 'occupied' && (
                    <Button size="sm" variant="outline" className="flex-1">
                      Check Bill
                    </Button>
                  )}
                  {table.status === 'maintenance' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => updateTable({ tableId: table.id, updates: { status: 'available' } })}
                    >
                      Mark Clean
                    </Button>
                  )}
                  {table.status === 'reserved' && (
                    <Button size="sm" variant="outline" className="flex-1">
                      Seat Now
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TableStatus;