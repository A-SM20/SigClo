'use client';

import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Send, MoreVertical, Phone, Video } from 'lucide-react';
import { GroupDetailsModal } from './GroupDetailsModal';

export function ChatArea() {
  const { user } = useAuthStore();
  const { activeConversationId, conversations, messages, fetchMessages } = useChatStore();
  const { sendMessage } = useWebSocket();
  const [inputText, setInputText] = useState('');
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find(c => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId) return;
    
    sendMessage(activeConversationId, inputText);
    setInputText('');
  };

  if (!conversation) return null;

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Header */}
      <header 
        className={`h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white ${conversation.is_group ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
        onClick={() => {
            if (conversation.is_group) setShowGroupDetails(true);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
            {conversation.display_name?.[0]?.toUpperCase() || '#'}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{conversation.display_name}</h2>
            <p className="text-xs text-blue-500 font-medium">{conversation.is_group ? 'Group Chat' : 'Signal Connection'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <button className="hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-gray-50">
            <Video size={20} />
          </button>
          <button className="hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-gray-50">
            <Phone size={20} />
          </button>
          <button className="hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-50">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {showGroupDetails && (
        <GroupDetailsModal 
            conversationId={conversation.id} 
            onClose={() => setShowGroupDetails(false)} 
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {activeMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          activeMessages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="text-[15px] leading-relaxed">{msg.content}</p>
                  <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Signal message"
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full px-5 py-3 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:opacity-50 disabled:bg-gray-300 hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
