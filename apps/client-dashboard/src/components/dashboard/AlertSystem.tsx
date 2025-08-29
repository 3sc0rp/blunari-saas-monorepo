import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertNotification } from '@/types/dashboard';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  X, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertSystemProps {
  alerts: AlertNotification[];
  onDismiss: (alertId: string) => void;
  onClearAll: () => void;
}

const AlertSystem: React.FC<AlertSystemProps> = ({ 
  alerts, 
  onDismiss, 
  onClearAll 
}) => {
  const getAlertIcon = (type: AlertNotification['type']) => {
    switch (type) {
      case 'critical':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      case 'success':
        return CheckCircle;
      default:
        return Info;
    }
  };

  const getAlertStyles = (type: AlertNotification['type']) => {
    switch (type) {
      case 'critical':
        return {
          iconColor: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/20'
        };
      case 'warning':
        return {
          iconColor: 'text-warning',
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/20'
        };
      case 'info':
        return {
          iconColor: 'text-primary',
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/20'
        };
      case 'success':
        return {
          iconColor: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/20'
        };
      default:
        return {
          iconColor: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/20'
        };
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-center">
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 text-success mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">
                All systems operational
              </p>
              <p className="text-xs text-muted-foreground">
                No alerts at this time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            System Alerts
            <Badge variant="outline" className="ml-2">
              {alerts.length}
            </Badge>
          </CardTitle>
          {alerts.length > 1 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {alerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              const styles = getAlertStyles(alert.type);
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`p-4 rounded-lg border-2 ${styles.bgColor} ${styles.borderColor} relative`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${styles.iconColor}`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {alert.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${styles.iconColor} border-current`}
                        >
                          {alert.type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {alert.time}
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.action && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={alert.action.handler}
                              className="text-xs h-7 px-2"
                            >
                              {alert.action.label}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                          {alert.dismissible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDismiss(alert.id)}
                              className="h-7 w-7 p-0 hover:bg-destructive/20"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertSystem;