import { useEffect, useRef, useState } from 'react';
import type { WSMessage } from '../types';

interface UseWebSocketOptions {
  onMessage: (msg: WSMessage) => void;
}

export function useWebSocket({ onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [, setReconnectCount] = useState(0);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setReconnectCount(0);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as WSMessage;
          onMessage(data);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(() => {
          setReconnectCount(c => c + 1);
          connect();
        }, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(ping);
      wsRef.current?.close();
    };
  }, [onMessage]);

  return { connected };
}
