import { Plus, Calendar, Users, Table, Settings, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const QuickActions = () => {
  const actions = [
    {
      title: "New Booking",
      description: "Add a new reservation",
      icon: Plus,
      color: "bg-gradient-primary text-primary-foreground",
      action: () => console.log("New booking")
    },
    {
      title: "View Calendar",
      description: "Check availability",
      icon: Calendar,
      color: "bg-gradient-warm text-secondary-foreground",
      action: () => console.log("View calendar")
    },
    {
      title: "Manage Tables",
      description: "Table status & layout",
      icon: Table,
      color: "bg-accent text-accent-foreground",
      action: () => console.log("Manage tables")
    },
    {
      title: "Customer List",
      description: "View all customers",
      icon: Users,
      color: "bg-muted text-muted-foreground hover:bg-muted/80",
      action: () => console.log("Customer list")
    },
    {
      title: "Reports",
      description: "Analytics & insights",
      icon: BarChart3,
      color: "bg-muted text-muted-foreground hover:bg-muted/80",
      action: () => console.log("Reports")
    },
    {
      title: "Settings",
      description: "Restaurant preferences",
      icon: Settings,
      color: "bg-muted text-muted-foreground hover:bg-muted/80",
      action: () => console.log("Settings")
    }
  ];

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className={`h-20 flex-col space-y-2 transition-all duration-300 hover:scale-105 ${action.color}`}
                onClick={action.action}
              >
                <Icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="text-xs font-medium">{action.title}</div>
                  <div className="text-xs opacity-80">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;