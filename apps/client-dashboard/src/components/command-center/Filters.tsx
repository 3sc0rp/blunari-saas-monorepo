import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface FiltersState {
  party?: number[];
  channel?: Array<'WEB' | 'PHONE' | 'WALKIN'>;
  status?: string[];
  deposits?: 'ON' | 'OFF' | null;
  vip?: boolean | null;
}

interface FiltersProps {
  value: FiltersState;
  onChange: (value: FiltersState) => void;
  disabled?: boolean;
}

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];
const CHANNELS = [
  { id: 'WEB' as const, label: 'Web', count: 23 },
  { id: 'PHONE' as const, label: 'Phone', count: 12 },
  { id: 'WALKIN' as const, label: 'Walk-in', count: 8 }
];
const STATUSES = [
  { id: 'confirmed', label: 'Confirmed', count: 31 },
  { id: 'seated', label: 'Seated', count: 18 },
  { id: 'completed', label: 'Completed', count: 7 },
  { id: 'cancelled', label: 'Cancelled', count: 3 }
];

interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const FilterChip: React.FC<FilterChipProps> = ({ 
  label, 
  active = false, 
  count, 
  onClick, 
  children,
  className 
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          onClick={onClick}
          className={cn(
            "glass border border-white/10 text-white/90 hover:bg-white/5 h-8 px-3 rounded-md",
            "focus:ring-accent focus:ring-2 focus:ring-offset-0",
            active && "bg-blue-500/20 border-blue-400/30 text-blue-300",
            className
          )}
        >
          <span className="text-sm font-medium">{label}</span>
          {count !== undefined && (
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-2 h-5 px-1.5 text-xs",
                active ? "bg-blue-400/20 text-blue-200" : "bg-white/10 text-white/70"
              )}
            >
              {count}
            </Badge>
          )}
          {children && <ChevronDown className="w-3 h-3 ml-1 opacity-50" />}
        </Button>
      </PopoverTrigger>
      {children && (
        <PopoverContent className="glass border-white/10 w-64 p-3">
          {children}
        </PopoverContent>
      )}
    </Popover>
  );
};

const MultiSelectContent: React.FC<{
  title: string;
  options: Array<{ id: string; label: string; count?: number }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}> = ({ title, options, selected, onChange }) => {
  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-white/90">{title}</h4>
      <div className="space-y-2">
        {options.map(option => (
          <div key={option.id} className="flex items-center space-x-2">
            <Checkbox
              id={option.id}
              checked={selected.includes(option.id)}
              onCheckedChange={() => handleToggle(option.id)}
              className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            />
            <label 
              htmlFor={option.id}
              className="text-sm text-white/80 cursor-pointer flex-1 flex justify-between"
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className="text-white/50">({option.count})</span>
              )}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export function Filters({ value, onChange, disabled = false }: FiltersProps) {
  const [partySizeOpen, setPartySizeOpen] = useState(false);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (value.party?.length) count++;
    if (value.channel?.length) count++;
    if (value.status?.length) count++;
    if (value.deposits !== null) count++;
    if (value.vip !== null) count++;
    return count;
  };

  const clearAllFilters = () => {
    onChange({
      party: [],
      channel: [],
      status: [],
      deposits: null,
      vip: null
    });
  };

  const updatePartySize = (sizes: number[]) => {
    onChange({ ...value, party: sizes });
  };

  const updateChannel = (channels: string[]) => {
    onChange({ ...value, channel: channels as Array<'WEB' | 'PHONE' | 'WALKIN'> });
  };

  const updateStatus = (statuses: string[]) => {
    onChange({ ...value, status: statuses });
  };

  const toggleDeposits = () => {
    const newValue = value.deposits === 'ON' ? 'OFF' : 
                    value.deposits === 'OFF' ? null : 'ON';
    onChange({ ...value, deposits: newValue });
  };

  const toggleVip = () => {
    const newValue = value.vip === true ? false :
                    value.vip === false ? null : true;
    onChange({ ...value, vip: newValue });
  };

  return (
    <div 
      className="flex items-center gap-3 overflow-x-auto scrollbar-none"
      role="toolbar"
      aria-label="Reservation filters"
    >
      {/* Party Size */}
      <FilterChip
        label="Party Size"
        active={!!value.party?.length}
        count={value.party?.length}
        className={value.party?.length ? "bg-blue-500/20 border-blue-400/30 text-blue-300" : ""}
      >
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/90">Party Size</h4>
          <div className="grid grid-cols-4 gap-2">
            {PARTY_SIZES.map(size => (
              <Button
                key={size}
                variant={value.party?.includes(size) ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  const current = value.party || [];
                  if (current.includes(size)) {
                    updatePartySize(current.filter(s => s !== size));
                  } else {
                    updatePartySize([...current, size]);
                  }
                }}
                className={cn(
                  "h-8 w-8 p-0",
                  value.party?.includes(size) 
                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                    : "glass border-white/10 text-white/80 hover:bg-white/5"
                )}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
      </FilterChip>

      {/* Channel */}
      <FilterChip
        label="Channel"
        active={!!value.channel?.length}
        count={value.channel?.length}
      >
        <MultiSelectContent
          title="Channel"
          options={CHANNELS}
          selected={value.channel || []}
          onChange={updateChannel}
        />
      </FilterChip>

      {/* Status */}
      <FilterChip
        label="Status"
        active={!!value.status?.length}
        count={value.status?.length}
      >
        <MultiSelectContent
          title="Status"
          options={STATUSES}
          selected={value.status || []}
          onChange={updateStatus}
        />
      </FilterChip>

      {/* Deposits */}
      <FilterChip
        label="Deposits"
        active={value.deposits !== null}
        onClick={toggleDeposits}
      />

      {/* VIP */}
      <FilterChip
        label="VIP"
        active={value.vip !== null}
        onClick={toggleVip}
      />

      {/* Clear All */}
      {getActiveFiltersCount() > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="glass border-white/10 text-white/70 hover:bg-white/5 h-8 px-3 rounded-md"
        >
          <X className="w-3 h-3 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
}
