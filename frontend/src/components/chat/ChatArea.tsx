'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Send, MoreVertical, Phone, Video, Check, CheckCheck, Plus, Smile, Mic, Search, ChevronLeft } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { GroupDetailsModal } from './GroupDetailsModal';

export function ChatArea() {
  const { user } = useAuthStore();
  const { activeConversationId, conversations, messages, fetchMessages, typingUsers, setActiveConversation } = useChatStore();
  const { sendMessage, sendTyping, sendReceipt } = useWebSocket();
  const [inputText, setInputText] = useState('');
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const conversation = conversations.find(c => c.id === activeConversationId);
  
  const activeMessages = useMemo(() => {
    return activeConversationId ? messages[activeConversationId] || [] : [];
  }, [activeConversationId, messages]);

  const activeTyping = useMemo(() => {
    return activeConversationId ? typingUsers[activeConversationId] || [] : [];
  }, [activeConversationId, typingUsers]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  useEffect(() => {
    // Mark all incoming messages as read when viewing them
    if (activeConversationId && user) {
      activeMessages.forEach(msg => {
        if (msg.sender_id !== user.id) {
          const myReceipt = msg.receipts?.[user.id];
          if (myReceipt !== 'read') {
            sendReceipt(msg.id, 'read');
          }
        }
      });
    }
  }, [activeConversationId, activeMessages, user, sendReceipt]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, activeTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId) return;
    
    sendMessage(activeConversationId, inputText);
    setInputText('');
    sendTyping(activeConversationId, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (!activeConversationId) return;

    sendTyping(activeConversationId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(activeConversationId, false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  if (!conversation) return null;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-signal-dark h-full">
      {/* Header */}
      <header 
        className={`h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-signal-darkBorder bg-white dark:bg-signal-dark ${conversation.is_group ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-signal-darkPanel transition-colors' : ''}`}
        onClick={() => {
            if (conversation.is_group) setShowGroupDetails(true);
        }}
      >
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-signal-darkPanel rounded-full"
            onClick={() => setActiveConversation(null)}
          >
            <ChevronLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {conversation.display_name?.[0]?.toUpperCase() || '#'}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-signal-textDark">{conversation.display_name}</h2>
            <p className="text-xs text-blue-500 font-medium">{conversation.is_group ? 'Group Chat' : 'Signal Connection'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
          <button className="hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-50 dark:hover:bg-signal-darkPanel">
            <Video size={20} />
          </button>
          <button className="hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-50 dark:hover:bg-signal-darkPanel">
            <Phone size={20} />
          </button>
          <button className="hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-50 dark:hover:bg-signal-darkPanel">
            <Search size={20} />
          </button>
          <button className="hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-50 dark:hover:bg-signal-darkPanel">
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-signal-dark">
        {activeMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          activeMessages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const prevMsg = index > 0 ? activeMessages[index - 1] : null;
            const nextMsg = index < activeMessages.length - 1 ? activeMessages[index + 1] : null;
            
            // Grouping logic: same sender within 2 minutes
            const isConsecutivePrev = prevMsg && prevMsg.sender_id === msg.sender_id && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 120000);
            const isConsecutiveNext = nextMsg && nextMsg.sender_id === msg.sender_id && (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() < 120000);
            
            // Show avatar for incoming group messages on the LAST message of a block
            const showAvatar = conversation.is_group && !isMe && !isConsecutiveNext;
            
            let status = 'sent';
            if (isMe && msg.receipts) {
              const vals = Object.values(msg.receipts);
              if (vals.includes('read')) status = 'read';
              else if (vals.includes('delivered')) status = 'delivered';
            }

            return (
              <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isConsecutivePrev ? 'mt-1' : 'mt-4'}`}>
                {conversation.is_group && !isMe && (
                  <div className="w-8 flex-shrink-0 mr-2 flex items-end">
                    {showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs font-semibold">
                        {/* We don't have the user's name on the msg object natively, so using an initial or placeholder */}
                        U
                      </div>
                    )}
                  </div>
                )}
                
                <div 
                  className={`max-w-[70%] px-3 py-2 text-[15px] leading-relaxed shadow-sm ${
                    isMe 
                      ? 'bg-signal-blue text-white' 
                      : 'bg-[#F1F1F4] dark:bg-signal-darkPanel dark:text-signal-textDark text-gray-900 border border-transparent dark:border-signal-darkBorder'
                  } ${
                    isMe 
                      ? `rounded-l-[18px] ${!isConsecutivePrev ? 'rounded-tr-[18px]' : 'rounded-tr-[4px]'} ${!isConsecutiveNext ? 'rounded-br-[18px]' : 'rounded-br-[4px]'}`
                      : `rounded-r-[18px] ${!isConsecutivePrev ? 'rounded-tl-[18px]' : 'rounded-tl-[4px]'} ${!isConsecutiveNext ? 'rounded-bl-[18px]' : 'rounded-bl-[4px]'}`
                  }`}
                >
                  <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
                  <div className={`flex items-center gap-1 text-[10px] mt-0.5 select-none ${isMe ? 'justify-end text-blue-200' : 'justify-end text-gray-400'}`}>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && (
                      <span className="ml-1">
                        {status === 'read' ? <CheckCheck size={14} className="text-blue-200" /> :
                         status === 'delivered' ? <CheckCheck size={14} className="opacity-70" /> :
                         <Check size={14} className="opacity-70" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {activeTyping.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-signal-dark border-t border-transparent flex items-end gap-2">
        <button className="p-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-signal-darkPanel flex-shrink-0">
          <Plus size={22} />
        </button>
        
        <form onSubmit={handleSend} className="flex-1 flex items-end bg-gray-100 dark:bg-signal-darkPanel rounded-3xl border border-transparent focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-colors">
          <TextareaAutosize
            minRows={1}
            maxRows={6}
            value={inputText}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Signal message"
            className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-[15px] dark:text-white placeholder-gray-500 outline-none resize-none overflow-hidden"
          />
          <button type="button" className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors flex-shrink-0">
            <Smile size={22} />
          </button>
        </form>

        {inputText.trim() ? (
          <button
            onClick={handleSend}
            className="p-3 bg-signal-blue hover:bg-signal-blueHover text-white transition-colors rounded-full flex-shrink-0 shadow-sm"
          >
            <Send size={20} />
          </button>
        ) : (
          <button className="p-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-signal-darkPanel flex-shrink-0">
            <Mic size={22} />
          </button>
        )}
      </div>
    </div>
  );
}
