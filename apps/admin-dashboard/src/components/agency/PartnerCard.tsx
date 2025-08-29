import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AgencyPartner } from '@/types/agency';
import { Mail, Phone, Globe, TrendingUp, Star, Calendar, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PartnerCardProps {
  partner: AgencyPartner;
  onViewDetails?: (partnerId: string) => void;
  onUpdateStatus?: (partnerId: string, status: AgencyPartner['status']) => void;
}

export function PartnerCard({ partner, onViewDetails, onUpdateStatus }: PartnerCardProps) {
  const getTierColor = (tier: AgencyPartner['tier']) => {
    switch (tier) {
      case 'Gold':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 'Silver':
        return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
      case 'Bronze':
        return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: AgencyPartner['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={partner.avatar} alt={partner.name} />
              <AvatarFallback>{partner.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{partner.name}</h3>
              <p className="text-sm text-muted-foreground">{partner.company}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={getTierColor(partner.tier)}>
              {partner.tier}
            </Badge>
            <Badge className={getStatusColor(partner.status)}>
              {partner.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium">{formatCurrency(partner.monthlyCommission)}</span>
              <span className="text-muted-foreground">this month</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{partner.satisfactionScore}/5.0</span>
              <span className="text-muted-foreground">satisfaction</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>{partner.conversionRate}%</span>
              <span className="text-muted-foreground">conversion</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span>{partner.activeDemos}</span>
              <span className="text-muted-foreground">active demos</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{partner.email}</span>
          </div>
          {partner.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{partner.phone}</span>
            </div>
          )}
          {partner.website && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <a href={partner.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                {partner.website}
              </a>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-2">
          Last active {formatDistanceToNow(new Date(partner.lastActive), { addSuffix: true })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(partner.id)}
            className="flex-1"
          >
            View Details
          </Button>
          {onUpdateStatus && partner.status !== 'Active' && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(partner.id, 'Active')}
              className="bg-green-600 hover:bg-green-700"
            >
              Activate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}