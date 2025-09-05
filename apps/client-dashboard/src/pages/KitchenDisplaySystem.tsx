import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Clock,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  Circle,
  Play,
  Pause,
  RotateCcw,
  Users,
  Timer,
  Utensils,
  Eye,
  Loader2,
} from "lucide-react";
import {
  KitchenTicket,
  KitchenTicketItem,
  KitchenDisplayStatus,
} from "@/types/restaurant";

// Mock data for kitchen tickets
const mockTickets: KitchenTicket[] = [
  {
    id: "1",
    order_id: "order-1",
    table_number: "Table 7",
    customer_name: "Smith",
    status: "new",
    priority: "normal",
    estimated_completion: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    special_instructions: "No onions, extra sauce",
    items: [
      {
        id: "1",
        ticket_id: "1",
        menu_item_name: "Caesar Salad",
        quantity: 1,
        special_instructions: "Dressing on the side",
        status: "new",
        prep_time_minutes: 8,
      },
      {
        id: "2",
        ticket_id: "1",
        menu_item_name: "Grilled Salmon",
        quantity: 1,
        special_instructions: "Medium rare",
        status: "new",
        prep_time_minutes: 18,
      }
    ],
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    order_id: "order-2",
    table_number: "Table 3",
    customer_name: "Johnson",
    status: "preparing",
    priority: "high",
    estimated_completion: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
    items: [
      {
        id: "3",
        ticket_id: "2",
        menu_item_name: "Ribeye Steak",
        quantity: 2,
        special_instructions: "One medium, one well done",
        status: "preparing",
        prep_time_minutes: 25,
        started_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      },
      {
        id: "4",
        ticket_id: "2",
        menu_item_name: "Truffle Fries",
        quantity: 1,
        status: "ready",
        prep_time_minutes: 10,
        started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      }
    ],
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    order_id: "order-3",
    table_number: "Takeout",
    customer_name: "Williams",
    status: "ready",
    priority: "urgent",
    estimated_completion: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    items: [
      {
        id: "5",
        ticket_id: "3",
        menu_item_name: "Fish & Chips",
        quantity: 2,
        status: "ready",
        prep_time_minutes: 15,
        started_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      }
    ],
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const statusColors = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  served: "bg-gray-100 text-gray-800 border-gray-200",
};

const priorityColors = {
  low: "border-l-gray-400",
  normal: "border-l-blue-400",
  high: "border-l-orange-400",
  urgent: "border-l-red-400",
};

const statusIcons = {
  new: Circle,
  preparing: Play,
  ready: CheckCircle,
  served: Eye,
};

const KitchenDisplaySystem: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<KitchenTicket[]>(mockTickets);
  const [selectedStatus, setSelectedStatus] = useState<KitchenDisplayStatus | "all">("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter tickets based on selected status
  const filteredTickets = useMemo(() => {
    if (selectedStatus === "all") return tickets;
    return tickets.filter(ticket => ticket.status === selectedStatus);
  }, [tickets, selectedStatus]);

  // Sort tickets by priority and time
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      // First sort by priority
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then sort by created time (oldest first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [filteredTickets]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalTickets = tickets.length;
    const newTickets = tickets.filter(t => t.status === "new").length;
    const preparingTickets = tickets.filter(t => t.status === "preparing").length;
    const readyTickets = tickets.filter(t => t.status === "ready").length;
    const avgWaitTime = tickets.length > 0 ? 
      tickets.reduce((sum, ticket) => {
        const waitTime = (currentTime.getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60);
        return sum + waitTime;
      }, 0) / tickets.length : 0;

    return {
      totalTickets,
      newTickets,
      preparingTickets,
      readyTickets,
      avgWaitTime,
    };
  }, [tickets, currentTime]);

  const handleStatusChange = async (ticketId: string, newStatus: KitchenDisplayStatus) => {
    try {
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { 
              ...ticket, 
              status: newStatus,
              updated_at: new Date().toISOString()
            }
          : ticket
      ));
      
      toast({
        title: "Status Updated",
        description: `Ticket moved to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const handleItemStatusChange = async (ticketId: string, itemId: string, newStatus: KitchenDisplayStatus) => {
    try {
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? {
              ...ticket,
              items: ticket.items.map(item => 
                item.id === itemId 
                  ? { 
                      ...item, 
                      status: newStatus,
                      ...(newStatus === "preparing" && !item.started_at ? { started_at: new Date().toISOString() } : {}),
                      ...(newStatus === "ready" ? { completed_at: new Date().toISOString() } : {}),
                    }
                  : item
              ),
              updated_at: new Date().toISOString()
            }
          : ticket
      ));

      toast({
        title: "Item Updated",
        description: `Item marked as ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const elapsed = (currentTime.getTime() - new Date(createdAt).getTime()) / (1000 * 60);
    return Math.floor(elapsed);
  };

  const getEstimatedTimeRemaining = (estimatedCompletion: string) => {
    const remaining = (new Date(estimatedCompletion).getTime() - currentTime.getTime()) / (1000 * 60);
    return Math.max(0, Math.floor(remaining));
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="w-8 h-8" />
            Kitchen Display System
          </h1>
          <p className="text-muted-foreground">
            Real-time order tracking and kitchen workflow management
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-lg">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.totalTickets}</p>
              </div>
              <Utensils className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Orders</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.newTickets}</p>
              </div>
              <Circle className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Preparing</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.preparingTickets}</p>
              </div>
              <Play className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready</p>
                <p className="text-2xl font-bold text-green-600">{analytics.readyTickets}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Wait</p>
                <p className="text-2xl font-bold">{analytics.avgWaitTime.toFixed(0)}m</p>
              </div>
              <Timer className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {["all", "new", "preparing", "ready"].map(status => (
          <Button
            key={status}
            variant={selectedStatus === status ? "default" : "outline"}
            onClick={() => setSelectedStatus(status as KitchenDisplayStatus | "all")}
            className="capitalize"
          >
            {status === "all" ? "All Orders" : status}
          </Button>
        ))}
      </div>

      {/* Kitchen Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {sortedTickets.map(ticket => {
            const StatusIcon = statusIcons[ticket.status];
            const timeElapsed = getTimeElapsed(ticket.created_at);
            const timeRemaining = getEstimatedTimeRemaining(ticket.estimated_completion);
            const isOverdue = timeRemaining === 0 && ticket.status !== "ready" && ticket.status !== "served";

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`${priorityColors[ticket.priority]} border-l-4 ${isOverdue ? 'ring-2 ring-red-400' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-5 h-5" />
                        <div>
                          <h3 className="font-semibold text-lg">{ticket.table_number}</h3>
                          <p className="text-sm text-muted-foreground">{ticket.customer_name}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge className={statusColors[ticket.status]}>
                          {ticket.status}
                        </Badge>
                        {ticket.priority !== "normal" && (
                          <Badge variant="outline" className="ml-1 capitalize">
                            {ticket.priority}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Ordered: {formatTime(ticket.created_at)} ({timeElapsed}m ago)
                      </span>
                      {isOverdue ? (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          OVERDUE
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          ETA: {timeRemaining}m
                        </span>
                      )}
                    </div>

                    {ticket.special_instructions && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <strong>Special Instructions:</strong> {ticket.special_instructions}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {ticket.items.map(item => {
                        const ItemStatusIcon = statusIcons[item.status];
                        const itemTimeElapsed = item.started_at ? getTimeElapsed(item.started_at) : 0;

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border-2 ${statusColors[item.status]}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <ItemStatusIcon className="w-4 h-4" />
                                <span className="font-medium">
                                  {item.quantity}x {item.menu_item_name}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                {item.status === "new" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleItemStatusChange(ticket.id, item.id, "preparing")}
                                  >
                                    Start
                                  </Button>
                                )}
                                {item.status === "preparing" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleItemStatusChange(ticket.id, item.id, "ready")}
                                  >
                                    Done
                                  </Button>
                                )}
                              </div>
                            </div>

                            {item.special_instructions && (
                              <p className="text-sm text-muted-foreground mb-2">
                                <em>{item.special_instructions}</em>
                              </p>
                            )}

                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Prep time: {item.prep_time_minutes}m</span>
                              {item.started_at && (
                                <span>Cooking: {itemTimeElapsed}m</span>
                              )}
                              {item.completed_at && (
                                <span>Completed: {formatTime(item.completed_at)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-between">
                      {ticket.status === "new" && (
                        <Button
                          onClick={() => handleStatusChange(ticket.id, "preparing")}
                          className="flex-1"
                        >
                          Start Order
                        </Button>
                      )}
                      
                      {ticket.status === "preparing" && 
                       ticket.items.every(item => item.status === "ready") && (
                        <Button
                          onClick={() => handleStatusChange(ticket.id, "ready")}
                          className="flex-1"
                        >
                          Mark Ready
                        </Button>
                      )}
                      
                      {ticket.status === "ready" && (
                        <Button
                          onClick={() => handleStatusChange(ticket.id, "served")}
                          className="flex-1"
                          variant="outline"
                        >
                          Mark Served
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {sortedTickets.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders to display</h3>
            <p className="text-muted-foreground">
              {selectedStatus === "all" 
                ? "All caught up! No active orders in the kitchen."
                : `No orders with status "${selectedStatus}".`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KitchenDisplaySystem;
