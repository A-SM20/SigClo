'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';

interface WebSocketContextType {
  sendMessage: (conversationId: number, content: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { addMessage } = useChatStore();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = `ws://127.0.0.1:8000/ws?token=${token}`;
    
    if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message') {
            addMessage(data.message);
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
      };
    }

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user, addMessage]);

  const sendMessage = (conversationId: number, content: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'chat_message',
        conversation_id: conversationId,
        content: content
      }));
    } else {
      console.error("WebSocket is not connected");
    }
  };

  return (
    <WebSocketContext.Provider value={{ sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
