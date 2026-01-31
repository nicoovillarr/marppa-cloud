import { useContext } from "react";
import { WebSocketContext } from "../contexts/websocket-context";

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx)
    throw new Error("useWebSocket must be used inside a WebSocketProvider");
  return ctx;
};
