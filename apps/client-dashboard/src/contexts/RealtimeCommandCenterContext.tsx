import React, { createContext, useContext, ReactNode } from "react";
import { useRealtimeCommandCenter, RealtimeBooking, RealtimeTable, WaitlistEntry, CommandCenterMetrics, RealtimeConnectionState } from "@/hooks/useRealtimeCommandCenter";

interface RealtimeCommandCenterContextType {
  // Data
  bookings: RealtimeBooking[];
  tables: RealtimeTable[];
  waitlist: WaitlistEntry[];
  metrics: CommandCenterMetrics;
  
  // Status
  isLoading: boolean;
  error: Error | null; // FIX: Replace 'any' with proper Error type
  connectionStatus: RealtimeConnectionState; // FIX: Use proper connection status type
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
