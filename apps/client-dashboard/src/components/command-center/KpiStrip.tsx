import React from "react";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type KpiCard = {
  id: string;
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  spark?: number[];
  hint?: string;
  sublabel?: string;
  trendDirection?: 'up' | 'down';
};

interface KpiStripProps {
  items: KpiCard[];
  loading?: boolean;
}

const MiniSparkline: React.FC<{ data: number[]; tone?: string }> = ({ data, tone = 'default' }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 40; // 40px width
    const y = 12 - ((value - min) / range) * 10; // 12px height, 10px range
    return `${x},${y}`;
  }).join(' ');

  const colorClass = tone === 'success' ? 'stroke-green-400' : 
                    tone === 'warning' ? 'stroke-amber-400' :
                    tone === 'danger' ? 'stroke-red-400' :
                    'stroke-blue-400';

  return (
    <svg width="40" height="12" className="flex-shrink-0">
      <polyline
        fill="none"
        strokeWidth="1.5"
        className={colorClass}
        points={points}
      />
    </svg>
  );
};

const KpiCardSkeleton: React.FC = () => (
  <div className="glass rounded-[10px] p-4 flex-1 min-w-[140px]">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-16 bg-white/10" />
        <Skeleton className="h-6 w-20 bg-white/10" />
        <Skeleton className="h-3 w-12 bg-white/10" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-3 w-3 rounded-full bg-white/10" />
        <Skeleton className="h-3 w-10 bg-white/10" />
      </div>
    </div>
  </div>
);

const KpiCardComponent: React.FC<{ 
  card: KpiCard; 
  onInfoClick?: (id: string) => void; 
}> = ({ card, onInfoClick }) => {
  const getToneStyles = (tone?: string) => {
    switch (tone) {
      case 'success':
        return {
          dot: 'bg-green-400',
          accent: 'text-green-300',
          trend: 'text-green-300'
        };
      case 'warning':
        return {
          dot: 'bg-amber-400',
          accent: 'text-amber-300',
          trend: 'text-amber-300'
        };
      case 'danger':
        return {
          dot: 'bg-red-400',
          accent: 'text-red-300',
          trend: 'text-red-300'
        };
      default:
        return {
          dot: 'bg-blue-400',
          accent: 'text-blue-300',
          trend: 'text-slate-300'
        };
    }
  };

  const styles = getToneStyles(card.tone);

  return (
    <div className="glass rounded-[10px] p-4 flex-1 min-w-[140px] group hover:bg-white/[0.08] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60 font-medium">
              {card.label}
            </span>
            {card.hint && (
              <button
                onClick={() => onInfoClick?.(card.id)}
                className="text-white/40 hover:text-white/60 transition-colors"
                title={card.hint}
              >
                <Info className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="font-tabular text-2xl font-semibold text-white">
            {card.value}
          </div>
          {card.sublabel && (
            <div className={cn("text-xs font-medium flex items-center gap-1", styles.trend)}>
              {card.trendDirection === 'up' && <TrendingUp className="w-3 h-3" />}
              {card.trendDirection === 'down' && <TrendingDown className="w-3 h-3" />}
              {card.sublabel}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {/* Status indicator dot */}
          <div className={cn("w-2 h-2 rounded-full", styles.dot)} />
          
          {/* Mini sparkline */}
          {card.spark && (
            <MiniSparkline data={card.spark} tone={card.tone} />
          )}
        </div>
      </div>
    </div>
  );
};

export function KpiStrip({ items, loading = false }: KpiStripProps) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto scrollbar-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const handleInfoClick = (cardId: string) => {
    console.log(`Info clicked for KPI: ${cardId}`);
    // TODO: Show tooltip or modal with more details
  };

  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-none">
      {items.map((card) => (
        <KpiCardComponent
          key={card.id}
          card={card}
          onInfoClick={handleInfoClick}
        />
      ))}
    </div>
  );
}
