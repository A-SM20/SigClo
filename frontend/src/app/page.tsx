'use client';

import { useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import { LogOut, User as UserIcon, MessageSquare } from 'lucide-react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

export default function Home() {
  const { user, logout } = useAuthStore();
  const { fetchConversations, activeConversationId } = useChatStore();

  useEffect(() => {
    // Only fetch conversations if user is authenticated (handled by ProtectedRoute)
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  return (
    <ProtectedRoute>
      <WebSocketProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-signal-dark overflow-hidden relative font-sans text-gray-900 dark:text-gray-100">
          {/* Left Sidebar */}
          <div className={`w-full md:w-80 md:flex flex-col bg-white dark:bg-signal-dark border-r border-gray-200 dark:border-signal-darkBorder z-10 ${activeConversationId ? 'hidden' : 'flex'}`}>
            <Sidebar />
          </div>

          {/* Right Chat Area */}
          <div className={`flex-1 md:flex flex-col bg-white dark:bg-signal-dark ${activeConversationId ? 'flex' : 'hidden'}`}>
            {activeConversationId ? (
              <ChatArea />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-signal-dark">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 text-signal-blue shadow-sm">
                  <MessageSquare size={36} strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">Signal</h2>
                <p className="text-[15px] max-w-sm">Select a conversation or start a new chat to begin messaging.</p>
              </div>
            )}
          </div>
        </div>
      </WebSocketProvider>
    </ProtectedRoute>
  );
}


