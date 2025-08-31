import React, { useState, useEffect } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TenantInfo, PolicyResponse } from '@/types/booking-api';
import { getTenantPolicies } from '@/api/booking-proxy';

interface DepositSectionProps {
  tenant: TenantInfo;
  reservation: {
    party_size: number;
    date: string;
  };
}

const DepositSection: React.FC<DepositSectionProps> = ({ tenant, reservation }) => {
  const [policies, setPolicies] = useState<PolicyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPolicies = async () => {
      try {
        const policyData = await getTenantPolicies(tenant.tenant_id);
        setPolicies(policyData);
      } catch (err) {
        setError('Could not load deposit policies');
        console.warn('Failed to load policies:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPolicies();
  }, [tenant.tenant_id]);

  // Don't render anything if loading
  if (loading) {
    return null;
  }

  // Don't render if policies failed to load or deposit is not enabled
  if (error || !policies?.deposit?.enabled) {
    return null;
  }

  const { deposit } = policies;
  const depositAmount = deposit.amount || 
    (deposit.percentage ? reservation.party_size * 10 * (deposit.percentage / 100) : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <CreditCard className="w-4 h-4" />
          Deposit Required
          <Badge variant="outline">
            ${depositAmount} {deposit.currency || 'USD'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            {deposit.description || 
              `A deposit of $${depositAmount} will be collected upon arrival to secure your reservation.`}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default DepositSection;