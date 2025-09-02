import React, { useState, useEffect, useCallback, useMemo } from "react";

interface UseRealtimeOptions {
  endpoint?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoReconnect?: boolean;
}

interface RealtimeData {
  type: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectCount: number;
  lastError?: string;
}

export const useRealtime = (options: UseRealtimeOptions = {}) => {
  const {
    endpoint,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    autoReconnect = true,
  } = options;

  // Dynamically construct endpoint based on environment
  const wsEndpoint = useMemo(() => {
    if (endpoint) return endpoint;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    // For production, use the actual Supabase edge function URL
    if (window.location.hostname !== "localhost") {
      return `${protocol}//kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/realtime-websocket`;
    }

    // For development, use local endpoint
    return `${protocol}//${host}/functions/v1/realtime-websocket`;
  }, [endpoint]);

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    reconnectCount: 0,
  });
  const [lastMessage, setLastMessage] = useState<RealtimeData | null>(null);
  const [messageHistory, setMessageHistory] = useState<RealtimeData[]>([]);

  const cleanup = useCallback(() => {
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;

      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    }
  }, [socket]);

  const connect = useCallback(() => {
    if (connectionState.isConnecting || connectionState.isConnected) {
      return;
    }

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      lastError: undefined,
    }));

    try {
      const ws = new WebSocket(wsEndpoint);

      ws.onopen = () => {
        if (process.env.NODE_ENV === "development") {
          console.log("Real-time connection established");
        }
        setConnectionState({
          isConnected: true,
          isConnecting: false,
          reconnectCount: 0,
        });
      };

      ws.onmessage = (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          setLastMessage(data);

          // Keep last 100 messages for debugging
          setMessageHistory((prev) => {
            const newHistory = [...prev, data];
            return newHistory.slice(-100);
          });
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to parse real-time message:", error);
          }
        }
      };

      ws.onclose = (event) => {
        if (process.env.NODE_ENV === "development") {
          console.log("Real-time connection closed", {
            code: event.code,
            reason: event.reason,
          });
        }

        setConnectionState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        // Attempt reconnection if enabled and within limits
        if (
          autoReconnect &&
          connectionState.reconnectCount < maxReconnectAttempts
        ) {
          setTimeout(() => {
            setConnectionState((prev) => ({
              ...prev,
              reconnectCount: prev.reconnectCount + 1,
            }));
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Real-time connection error:", error);
        }

        setConnectionState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          lastError: "Connection failed",
        }));
      };

      setSocket(ws);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to establish real-time connection:", error);
      }

      setConnectionState((prev) => ({
        ...prev,
        isConnecting: false,
        lastError: "Failed to create connection",
      }));
    }
  }, [
    wsEndpoint,
    connectionState.isConnecting,
    connectionState.isConnected,
    connectionState.reconnectCount,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    cleanup();
    setSocket(null);
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      reconnectCount: 0,
    });
  }, [cleanup]);

  const sendMessage = useCallback(
    (message: Record<string, unknown>) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Cannot send message: WebSocket not connected");
        }
        return false;
      }

      try {
        socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to send message:", error);
        }
        return false;
      }
    },
    [socket],
  );

  const subscribe = useCallback(
    (channel: string) => {
      return sendMessage({
        type: "subscribe",
        channel,
      });
    },
    [sendMessage],
  );

  const trackEvent = useCallback(
    (event: string, data?: Record<string, unknown>) => {
      return sendMessage({
        type: "analytics_event",
        event,
        data,
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });
    },
    [sendMessage],
  );

  const sendNotification = useCallback(
    (
      title: string,
      message: string,
      severity: "info" | "warning" | "error" = "info",
    ) => {
      return sendMessage({
        type: "notification",
        title,
        message,
        severity,
      });
    },
    [sendMessage],
  );

  // Auto-connect on mount, cleanup on unmount
  useEffect(() => {
    // Delay initial connection to avoid race conditions
    const timeoutId = setTimeout(() => {
      connect();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...connectionState,
    lastMessage,
    messageHistory,
    sendMessage,
    subscribe,
    trackEvent,
    sendNotification,
    connect,
    disconnect,
    endpoint: wsEndpoint,
  };
};
