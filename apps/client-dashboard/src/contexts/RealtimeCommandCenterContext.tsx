import React, { createContext, useContext, ReactNode } from "react";
import { useRealtimeCommandCenter, RealtimeBooking, RealtimeTable, WaitlistEntry, CommandCenterMetrics } from "@/hooks/useRealtimeCommandCenter";

interface RealtimeCommandCenterContextType {
  // Data
  bookings: RealtimeBooking[];
  tables: RealtimeTable[];
  waitlist: WaitlistEntry[];
  metrics: CommandCenterMetrics;
  
  // Status
  isLoading: boolean;
  error: any;
  connectionStatus: {
    bookings: boolean;
    tables: boolean;
    waitlist: boolean;
  };
  isConnected: boolean;
  allConnected: boolean;
  lastUpdate: Date;
  
  // Actions
  refreshData: () => void;
  
  // Filtered data helpers
  todaysBookings: RealtimeBooking[];
  activeBookings: RealtimeBooking[];
  completedBookings: RealtimeBooking[];
  upcomingBookings: RealtimeBooking[];
}

const RealtimeCommandCenterContext = createContext<RealtimeCommandCenterContextType | null>(null);

export const RealtimeCommandCenterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const realtimeData = useRealtimeCommandCenter();

  return (
    <RealtimeCommandCenterContext.Provider value={realtimeData}>
      {children}
    </RealtimeCommandCenterContext.Provider>
  );
};

export const useRealtimeCommandCenterContext = () => {
  const context = useContext(RealtimeCommandCenterContext);
  if (!context) {
    throw new Error("useRealtimeCommandCenterContext must be used within a RealtimeCommandCenterProvider");
  }
  return context;
};
