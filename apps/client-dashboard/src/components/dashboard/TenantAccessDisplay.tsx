import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface TenantAccessDisplayProps {
  accessType: 'domain' | 'user';
  tenantSlug?: string;
  tenant: any;
}

const TenantAccessDisplay: React.FC<TenantAccessDisplayProps> = ({ 
  accessType, 
  tenantSlug, 
  tenant 
}) => {
  const getAccessInfo = () => {
    if (accessType === 'domain') {
      return {
        title: 'Restaurant Dashboard',
        description: `Accessing ${tenant?.name || tenantSlug} via ${window.location.hostname}`,
        icon: CheckCircle,
        color: 'text-success',
        bgColor: 'bg-success/10'
      };
    }

    return {
      title: 'Staff Access',
      description: `Authenticated access to ${tenant?.name}`,
      icon: CheckCircle,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    };
  };

  const info = getAccessInfo();

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${info.bgColor} flex items-center justify-center`}>
            <info.icon className={`h-5 w-5 ${info.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{info.title}</h3>
            <p className="text-sm text-muted-foreground">{info.description}</p>
          </div>
          <Badge variant="outline">
            {accessType === 'domain' ? 'Public Access' : 'Staff Access'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantAccessDisplay;