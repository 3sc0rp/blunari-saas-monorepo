import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservationDrawerProps {
  open: boolean;
  reservation: any;
  policy?: any;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onMove: () => void;
  onMessage: () => void;
  onCancel: () => Promise<void>;
  onApprove?: () => Promise<void>;
}

export function ReservationDrawer({
  open,
  reservation,
  policy,
  onOpenChange,
  onEdit,
  onMove,
  onMessage,
  onCancel,
  onApprove
}: ReservationDrawerProps) {
  if (!open || !reservation) return null;

  const isPending = (reservation.status || '').toLowerCase() === 'pending';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-96 glass border-l border-white/10 z-50 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Reservation Details
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Reservation Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/90">Guest Name</label>
              <p className="text-white mt-1">{reservation.guestName || 'No name'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white/90">Party Size</label>
                <p className="text-white mt-1">{reservation.partySize} guests</p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/90">Status</label>
                <p className="text-white mt-1 capitalize">{reservation.status}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white/90">Time</label>
              <p className="text-white mt-1">
                {new Date(reservation.start).toLocaleString()}
              </p>
            </div>

            {reservation.guestPhone && (
              <div>
                <label className="text-sm font-medium text-white/90">Phone</label>
                <p className="text-white mt-1">{reservation.guestPhone}</p>
              </div>
            )}

            {reservation.specialRequests && (
              <div>
                <label className="text-sm font-medium text-white/90">Special Requests</label>
                <p className="text-white mt-1">{reservation.specialRequests}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {isPending && onApprove && (
              <button
                onClick={() => onApprove?.()}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Confirm Reservation
              </button>
            )}

            <button
              onClick={onEdit}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Edit Reservation
            </button>
            
            <button
              onClick={onMove}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Move to Different Table
            </button>
            
            <button
              onClick={onMessage}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Message Guest
            </button>
            
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Cancel Reservation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
