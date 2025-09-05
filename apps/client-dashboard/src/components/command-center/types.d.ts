// Type declaration for MiniFloorplan component
declare module './MiniFloorplan' {
  import React from 'react';
  import type { TableRow, Reservation } from '@/hooks/useCommandCenterData';

  interface MiniFloorplanProps {
    tables: TableRow[];
    reservations: Reservation[];
    onFocusTable: (tableId: string) => void;
    focusTableId?: string;
  }

  export function MiniFloorplan(props: MiniFloorplanProps): React.JSX.Element;
  export default MiniFloorplan;
}

// Type declaration for KitchenLoadGauge component  
declare module './KitchenLoadGauge' {
  import React from 'react';

  interface KitchenLoadGaugeProps {
    percentage: number;
    label?: string;
    className?: string;
  }

  export function KitchenLoadGauge(props: KitchenLoadGaugeProps): React.JSX.Element;
  export default KitchenLoadGauge;
}
