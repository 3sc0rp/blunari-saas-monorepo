import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Check,
  Settings,
  Trash2,
  User,
  UserPlus,
  CreditCard,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    loading,
    refresh,
    getTimeAgo,
    getNotificationIcon,
    getNotificationColor,
  } = useNotifications();

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "User":
        return User;
      case "UserPlus":
        return UserPlus;
      case "CreditCard":
        return CreditCard;
      case "Activity":
        return Activity;
      case "AlertTriangle":
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  const getNotificationType = (type: string) => {
    switch (type) {
      case "system_alert":
        return "error";
      case "tenant_registered":
        return "success";
      case "employee_added":
        return "info";
      case "system_update":
        return "warning";
      case "payment_received":
        return "success";
      default:
        return "info";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with platform activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription>Latest platform alerts and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const IconComponent = getIconComponent(
                  getNotificationIcon(notification.type),
                );
                const color = getNotificationColor(notification.type);
                const type = getNotificationType(notification.type);
                const isRecent =
                  new Date(notification.created_at) >
                  new Date(Date.now() - 24 * 60 * 60 * 1000);

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start justify-between p-4 rounded-lg border ${
                      isRecent
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/30"
                    }`}
                  >
                    <div className="flex gap-3 flex-1">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          color === "blue"
                            ? "bg-blue-100 dark:bg-blue-900"
                            : color === "green"
                              ? "bg-green-100 dark:bg-green-900"
                              : color === "orange"
                                ? "bg-orange-100 dark:bg-orange-900"
                                : color === "red"
                                  ? "bg-red-100 dark:bg-red-900"
                                  : "bg-gray-100 dark:bg-gray-900"
                        }`}
                      >
                        <IconComponent
                          className={`h-4 w-4 ${
                            color === "blue"
                              ? "text-blue-600 dark:text-blue-400"
                              : color === "green"
                                ? "text-green-600 dark:text-green-400"
                                : color === "orange"
                                  ? "text-orange-600 dark:text-orange-400"
                                  : color === "red"
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-gray-600 dark:text-gray-400"
                          }`}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <Badge
                            variant={
                              type === "error"
                                ? "destructive"
                                : type === "warning"
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {type}
                          </Badge>
                          {isRecent && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(notification.created_at)}
                        </span>
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      aria-label={`Delete notification: ${notification.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
