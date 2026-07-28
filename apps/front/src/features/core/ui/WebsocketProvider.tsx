"use client";

import { useAuth } from "@/auth/models/useAuth";
import { fetcher } from "@/core/api/fetcher";
import React, {
  createContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { toast } from "sonner";

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

interface IBroadcastResponse {
  type: string;
  channel?: string;
  data: any;
}

type MessageHandler = (data: any) => void;

interface IWebSocketContext {
  sendMessage: (type: string, data?: any) => void;
  subscribe: (channel: string, callback: MessageHandler) => () => void;
  unsubscribe: (channel: string) => void;
  subscribeExec: (sessionId: string, callback: MessageHandler) => () => void;
  connected: boolean;
}

const WebSocketContext = createContext<IWebSocketContext | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isLoggedIn } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const queueRef = useRef<{ type: string; data?: any }[]>([]);
  const subsRef = useRef<Record<string, Set<MessageHandler>>>({});
  const execSubsRef = useRef<Record<string, MessageHandler>>({});
  const reconnectAttemptsRef = useRef(0);
  const pingRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const isAuthenticatedRef = useRef(false);
  const error = useRef<boolean>(false);

  const url = process.env.NEXT_PUBLIC_WS_URL;

  const connect = useCallback(() => {
    if (socketRef.current || !url) return;

    console.log("[WebSocket]: Connecting to WebSocket:", url);

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[WebSocket]: WebSocket connected successfully");
      if (error.current) {
        toast.success("Reconnected to the server.");
        error.current = false;
      }
      reconnectAttemptsRef.current = 0;
      setConnected(true);
      startPing();
    };

    socket.onclose = () => {
      console.warn("[WebSocket]: WebSocket closed");
      if (!error.current) toast.error("The connection to the server was lost.");
      error.current = true;
      socketRef.current = null;
      isAuthenticatedRef.current = false;
      setConnected(false);
      stopPing();
      abortReconnect();
      scheduleReconnect();
    };

    socket.onerror = (err) => {
      console.error("[WebSocket]: WebSocket error", err);
      socket.close();
      stopPing();
      abortReconnect();
    };

    socket.onmessage = (event) => {
      try {
        const message: IBroadcastResponse = JSON.parse(event.data);
        handleMessage(message);
      } catch (e) {
        console.error("[WebSocket]: Failed to parse WS message:", e);
      }
    };
  }, [url]);

  const disconnect = useCallback(() => {
    stopPing();
    reconnectRef.current && clearTimeout(reconnectRef.current);
    isAuthenticatedRef.current = false;
    queueRef.current = [];
    subsRef.current = {};
    reconnectAttemptsRef.current = 0;
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }

      socketRef.current = null;
    }
    setConnected(false);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectRef.current || socketRef.current) return;

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttemptsRef.current,
      RECONNECT_MAX_DELAY_MS,
    );

    console.log(
      `[WebSocket]: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})...`,
    );
    reconnectRef.current = setTimeout(() => {
      reconnectRef.current = null;
      reconnectAttemptsRef.current++;
      connect();
    }, delay);
  }, [connect]);

  const abortReconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const authenticate = useCallback(() => {
    if (!accessToken) return;
    sendMessage("AUTH", { accessToken });

    const timeout = setTimeout(() => {
      if (socketRef.current && !isAuthenticatedRef.current) {
        console.warn("[WebSocket]: Retrying AUTH after timeout...");
        sendMessage("AUTH", { accessToken });
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [accessToken]);

  const startPing = () => {
    if (pingRef.current) return;
    pingRef.current = setInterval(() => sendMessage("PING"), 30000);
  };

  const stopPing = () => {
    if (pingRef.current) {
      clearInterval(pingRef.current);
      pingRef.current = null;
    }
  };

  const flushQueue = () => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    while (queueRef.current.length) {
      const msg = queueRef.current.shift();
      if (!msg) continue;

      console.log(
        `[WebSocket]: Sending queued message of type: ${msg.type
        }, data: ${JSON.stringify(msg.data)}`
      );
      socket.send(JSON.stringify(msg));
    }
  };

  const sendMessage = useCallback((type: string, data?: any) => {
    const socket = socketRef.current;
    const msgWithToken = { type, data, token: accessToken };
    if (
      socket &&
      socket.readyState === WebSocket.OPEN &&
      (isAuthenticatedRef.current || type === "AUTH")
    ) {
      console.log(
        `[WebSocket]: Sending message of type: ${type}, data: ${JSON.stringify(
          data
        )}`
      );
      socket.send(JSON.stringify(msgWithToken));
    } else {
      queueRef.current.push(msgWithToken);
    }
  }, []);

  const subscribe = useCallback((channel: string, cb: MessageHandler) => {
    const handlers = subsRef.current[channel] ?? new Set<MessageHandler>();
    const isFirst = handlers.size === 0;
    handlers.add(cb);
    subsRef.current[channel] = handlers;

    if (isFirst) {
      console.log(`[WebSocket]: Subscribing to channel: ${channel}`);
      sendMessage("SUBSCRIBE_CHANNEL", { channel });
    }

    return () => {
      const current = subsRef.current[channel];
      if (!current) return;

      current.delete(cb);
      if (current.size === 0) {
        delete subsRef.current[channel];
        console.log(`[WebSocket]: Unsubscribing from channel: ${channel}`);
        sendMessage("UNSUBSCRIBE_CHANNEL", { channel });
      }
    };
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    delete subsRef.current[channel];
    console.log(`[WebSocket]: Unsubscribing from channel: ${channel}`);
    sendMessage("UNSUBSCRIBE_CHANNEL", { channel });
  }, []);

  const subscribeExec = useCallback((sessionId: string, cb: MessageHandler) => {
    execSubsRef.current[sessionId] = cb;

    return () => {
      delete execSubsRef.current[sessionId];
    };
  }, []);

  const handleMessage = (message: IBroadcastResponse) => {
    console.log(`[WebSocket]: Received WS message: ${JSON.stringify(message)}`);

    switch (message.type) {
      case "AUTH_SUCCESS":
        isAuthenticatedRef.current = true;
        Object.keys(subsRef.current).forEach((channel) => {
          sendMessage("SUBSCRIBE_CHANNEL", { channel });
        });
        flushQueue();
        return;
      case "PONG":
        console.debug("[WebSocket]: PONG received");
        return;
      default:
        if (message.type.startsWith("EXEC_")) {
          const sessionId = message.data?.sessionId as string | undefined;
          const handler = sessionId ? execSubsRef.current[sessionId] : undefined;
          handler?.(message);
          return;
        }

        const handlers = message.channel
          ? subsRef.current[message.channel]
          : undefined;

        if (!handlers || handlers.size === 0) {
          console.warn(
            `[WebSocket]: No handler for message type: ${message.type}, channel: ${message.channel}`
          );
          return;
        }

        handlers.forEach((handler) => handler(message));
    }
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  // The access token is an httpOnly cookie: ask the backend for it once the
  // session is confirmed, so the WS handshake can present it.
  useEffect(() => {
    if (isLoading || !isLoggedIn || accessToken) return;

    fetcher<{ token: string }>("/auth/ws-token")
      .then(({ token }) => setAccessToken(token ?? null))
      .catch((e) =>
        console.error("[WebSocket]: Failed to fetch WS token", e),
      );
  }, [isLoading, isLoggedIn, accessToken]);

  useEffect(() => {
    if (isLoading || !accessToken || !connected || isAuthenticatedRef.current)
      return;
    authenticate();
  }, [isLoading, accessToken, connected, authenticate]);

  const value = { sendMessage, subscribe, unsubscribe, subscribeExec, connected };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx)
    throw new Error("useWebSocket must be used inside a WebSocketProvider");
  return ctx;
};