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
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">
          {/* Left Sidebar */}
          <div className={`w-full md:w-80 md:flex flex-col bg-white border-r border-gray-200 z-10 ${activeConversationId ? 'hidden' : 'flex'}`}>
            <Sidebar />
          </div>

          {/* Right Chat Area */}
          <div className={`flex-1 md:flex flex-col bg-white ${activeConversationId ? 'flex' : 'hidden'}`}>
            {activeConversationId ? (
              <ChatArea />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500 bg-gray-50 border-l border-gray-200">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500 shadow-sm">
                  <MessageSquare size={28} />
                </div>
                <h2 className="text-2xl font-medium text-gray-900 mb-2">Signal Clone</h2>
                <p>Select a conversation or search for a user to start messaging.</p>
                
                {/* User Profile / Logout temporarily placed here for demo purposes */}
                <div className="mt-auto mb-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[280px]">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <UserIcon size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">{user?.display_name}</p>
                    <p className="text-xs text-gray-500">{user?.phone_number || user?.username}</p>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Log out"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </WebSocketProvider>
    </ProtectedRoute>
  );
}


