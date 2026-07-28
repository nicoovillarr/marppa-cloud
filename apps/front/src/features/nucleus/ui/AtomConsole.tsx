"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useWebSocket } from "@/core/ui/WebsocketProvider";

interface AtomConsoleProps {
  atomId: string;
}

function execClosedMessage(reason: string): string {
  switch (reason) {
    case "error":
      return "[session ended with an error]";
    case "idle-timeout":
      return "[session closed: idle for too long]";
    case "unauthorized":
      return "[session closed: no longer authorized]";
    case "exited":
      return "[session ended]";
    default:
      return "[session closed]";
  }
}

export function AtomConsole({ atomId }: AtomConsoleProps) {
  const { sendMessage, subscribeExec, connected } = useWebSocket();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let opened = false;

    const sessionId = crypto.randomUUID();
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      theme: { background: "#0b0f14" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    const unsubscribe = subscribeExec(sessionId, (message) => {
      switch (message.type) {
        case "EXEC_OPENED":
          opened = true;
          term.focus();
          break;
        case "EXEC_OUTPUT":
          term.write(message.data.chunk);
          break;
        case "EXEC_ERROR":
          term.writeln(`\r\n[error] ${message.data.message}`);
          break;
        case "EXEC_CLOSED":
          opened = false;
          term.writeln(`\r\n${execClosedMessage(message.data.reason)}`);
          break;
      }
    });

    const dataListener = term.onData((input) => {
      if (!opened) return;
      sendMessage("EXEC_INPUT", { sessionId, input });
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (opened) {
        sendMessage("EXEC_RESIZE", { sessionId, cols: term.cols, rows: term.rows });
      }
    });
    resizeObserver.observe(container);

    // Fitting before the terminal's monospace font has actually loaded produces
    // wrong row/col metrics: the pty gets sized off a guess, and once enough
    // output pushes the cursor down the mismatch shows up as the last line
    // rendering past the container's visible edge.
    document.fonts.ready.then(() => {
      if (disposed) return;
      fitAddon.fit();
      sendMessage("EXEC_OPEN", { sessionId, atomId, cols: term.cols, rows: term.rows });
    });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      dataListener.dispose();
      unsubscribe();
      sendMessage("EXEC_CLOSE", { sessionId });
      term.dispose();
    };
  }, [atomId, sendMessage, subscribeExec]);

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      {!connected && (
        <p className="text-xs text-status-danger">Reconnecting to the server…</p>
      )}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 rounded-lg overflow-hidden bg-[#0b0f14] p-2"
      />
    </div>
  );
}
