// Drawer state management utility
export type DrawerType = 'booking' | 'table' | 'waitlist';

export interface BookingData {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  partySize: number;
  bookingTime: string;
  tableNumber: string;
  status: string;
  specialRequests?: string;
  duration?: number;
  avatarUrl?: string;
  previousVisits?: number;
  estimatedRevenue?: number;
  [key: string]: unknown;
}

export interface TableData {
  id: string;
  number: string;
  seats: number;
  section: string;
  status: string;
  currentBooking?: BookingData;
  timeRemaining?: number;
  totalTurns?: number;
  todayRevenue?: number;
  [key: string]: unknown;
}

export interface WaitlistData {
  id: string;
  customerName: string;
  phone: string;
  partySize: number;
  status: string;
  waitTime?: number;
  estimatedWait?: number;
  quotedTime?: string;
  priority?: string;
  specialRequests?: string;
  [key: string]: unknown;
}

export type DrawerData = BookingData | TableData | WaitlistData | null;

export interface DrawerState {
  isOpen: boolean;
  type: DrawerType | null;
  data: DrawerData;
}

let drawerState: DrawerState = {
  isOpen: false,
  type: null,
  data: null
};

// Export function to control drawer state  
export const openDetailsDrawer = (type: DrawerType, data?: BookingData | TableData | WaitlistData) => {
  drawerState = { isOpen: true, type, data: data || null };
  // This would trigger a re-render in a real state management system
};

export const closeDetailsDrawer = () => {
  drawerState = { isOpen: false, type: null, data: null };
};

export const getDrawerState = (): DrawerState => {
  return { ...drawerState };
};
