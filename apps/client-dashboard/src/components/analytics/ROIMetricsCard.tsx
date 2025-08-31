import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Users, Shield, Target } from 'lucide-react';
import { ROIMetrics } from '@/types/analytics';

interface ROIMetricsCardProps {
  metrics: ROIMetrics;
}

const ROIMetricsCard: React.FC<ROIMetricsCardProps> = ({ metrics }) => {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const totalROI = metrics.feesAvoided.amount + metrics.extraCovers.revenue + metrics.noshowsPrevented.savedRevenue;

  return (
    <Card className="bg-gradient-primary text-primary-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          ROI Dashboard
        </CardTitle>
        <div className="text-3xl font-bold">{formatCurrency(totalROI)}</div>
        <p className="text-primary-foreground/80 text-sm">Total value generated</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-2/60 rounded-lg p-3 backdrop-blur-sm border border-surface-3/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Fees Avoided</span>
            </div>
            <div className="text-xl font-bold">{formatCurrency(metrics.feesAvoided.amount)}</div>
            <div className="text-xs text-primary-foreground/70 space-y-1">
              <div>No-shows: {formatCurrency(metrics.feesAvoided.noshowFeesAvoided)}</div>
              <div>Overdraft: {formatCurrency(metrics.feesAvoided.overdraftFeesAvoided)}</div>
              <div>Chargebacks: {formatCurrency(metrics.feesAvoided.chargebackFeesAvoided)}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-2/60 rounded-lg p-3 backdrop-blur-sm border border-surface-3/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Extra Covers</span>
            </div>
            <div className="text-xl font-bold">{metrics.extraCovers.count}</div>
            <div className="text-xs text-primary-foreground/70 space-y-1">
              <div>Revenue: {formatCurrency(metrics.extraCovers.revenue)}</div>
              <div>Optimized: {metrics.extraCovers.optimizedSeating}</div>
              <div>Per Cover: {formatCurrency(metrics.extraCovers.revenuePerCover)}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface-2/60 rounded-lg p-3 backdrop-blur-sm border border-surface-3/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">No-shows Prevented</span>
            </div>
            <div className="text-xl font-bold">{metrics.noshowsPrevented.count}</div>
            <div className="text-xs text-primary-foreground/70 space-y-1">
              <div>Saved: {formatCurrency(metrics.noshowsPrevented.savedRevenue)}</div>
              <div>Deposits: {metrics.noshowsPrevented.depositHolds}</div>
              <div>SMS Sent: {metrics.noshowsPrevented.smsReminders}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface-2/60 rounded-lg p-3 backdrop-blur-sm border border-surface-3/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">RevPASH Uplift</span>
            </div>
            <div className="text-xl font-bold">{metrics.revpashUplift.uplift}%</div>
            <div className="text-xs text-primary-foreground/70 space-y-1">
              <div>Current: {formatCurrency(metrics.revpashUplift.current)}</div>
              <div>Baseline: {formatCurrency(metrics.revpashUplift.baseline)}</div>
              <div>Utilization: {metrics.revpashUplift.seatUtilization.toFixed(1)}%</div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/20">
          <span className="text-sm text-primary-foreground/80">Performance Score</span>
          <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
            Excellent
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default ROIMetricsCard;