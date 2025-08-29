import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";

interface Table {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentBooking?: {
    customerName: string;
    arrivalTime: string;
    duration: string;
  };
}

const TableStatus = () => {
  // Mock data - in real app this would come from API
  const tables: Table[] = [
    {
      id: "1",
      number: "T-1",
      capacity: 2,
      status: "available"
    },
    {
      id: "2",
      number: "T-2",
      capacity: 4,
      status: "occupied",
      currentBooking: {
        customerName: "Johnson Party",
        arrivalTime: "6:30 PM",
        duration: "1h 30m"
      }
    },
    {
      id: "3",
      number: "T-3",
      capacity: 2,
      status: "reserved",
      currentBooking: {
        customerName: "Thompson",
        arrivalTime: "7:30 PM",
        duration: "Expected"
      }
    },
    {
      id: "4",
      number: "T-4",
      capacity: 6,
      status: "cleaning"
    },
    {
      id: "5",
      number: "T-5",
      capacity: 3,
      status: "available"
    },
    {
      id: "6",
      number: "T-6",
      capacity: 4,
      status: "occupied",
      currentBooking: {
        customerName: "Chen Party",
        arrivalTime: "6:00 PM",
        duration: "2h 15m"
      }
    }
  ];

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return 'bg-success/10 text-success border-success/20';
      case 'occupied':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'reserved':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'cleaning':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: Table['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Table Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tables.map((table) => (
            <Card key={table.id} className="p-4 border-2 transition-all duration-300 hover:shadow-medium">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{table.number}</h3>
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

              {table.currentBooking && (
                <div className="space-y-2 mb-3">
                  <div className="text-sm font-medium">{table.currentBooking.customerName}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {table.currentBooking.arrivalTime} • {table.currentBooking.duration}
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
                {table.status === 'cleaning' && (
                  <Button size="sm" variant="outline" className="flex-1">
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
      </CardContent>
    </Card>
  );
};

export default TableStatus;