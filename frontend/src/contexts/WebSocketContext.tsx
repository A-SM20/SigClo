'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';

interface WebSocketContextType {
  sendMessage: (conversationId: number, content: string) => void;
  sendTyping: (conversationId: number, isTyping: boolean) => void;
  sendReceipt: (messageId: number, status: 'delivered' | 'read') => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { addMessage, updateMessageReceipt, setTyping } = useChatStore();
  const ws = useRef<WebSocket | null>(null);

  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const connect = () => {
      if (!isMounted) return;
      const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws';
      const wsUrl = `${baseUrl}?token=${token}`;
      
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
          console.log('WebSocket connected');
          reconnectAttempts.current = 0;
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
              addMessage(data.message);
              // Send delivered receipt immediately
              if (data.message.sender_id !== user.id) {
                  if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                      ws.current.send(JSON.stringify({
                          type: 'message.receipt_updated',
                          message_id: data.message.id,
                          status: 'delivered'
                      }));
                  }
              }
            } else if (data.type === 'typing.start') {
              setTyping(data.conversation_id, data.user_id, true);
            } else if (data.type === 'typing.stop') {
              setTyping(data.conversation_id, data.user_id, false);
            } else if (data.type === 'message.receipt_updated') {
              updateMessageReceipt(data.conversation_id, data.message_id, data.user_id, data.status);
            }
          } catch (e) {
            console.error('Error parsing WS message', e);
          }
        };

        socket.onclose = () => {
          console.log('WebSocket disconnected');
          ws.current = null;
          
          if (isMounted) {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`Reconnecting in ${delay}ms...`);
            reconnectTimeout.current = setTimeout(() => {
              reconnectAttempts.current += 1;
              connect();
            }, delay);
          }
        };
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user, addMessage, updateMessageReceipt, setTyping]);

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

  const sendTyping = (conversationId: number, isTyping: boolean) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: isTyping ? 'typing.start' : 'typing.stop',
        conversation_id: conversationId
      }));
    }
  };

  const sendReceipt = (messageId: number, status: 'delivered' | 'read') => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'message.receipt_updated',
        message_id: messageId,
        status: status
      }));
    }
  };

  return (
    <WebSocketContext.Provider value={{ sendMessage, sendTyping, sendReceipt }}>
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
