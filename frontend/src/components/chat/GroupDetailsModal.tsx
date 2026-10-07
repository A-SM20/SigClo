import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { api } from '@/lib/api';
import { X, Users, UserMinus, UserPlus } from 'lucide-react';

interface GroupDetailsModalProps {
  conversationId: number;
  onClose: () => void;
}

export function GroupDetailsModal({ conversationId, onClose }: GroupDetailsModalProps) {
  const { conversations } = useChatStore();
  const [members, setMembers] = useState<any[]>([]);
  
  const conversation = conversations.find(c => c.id === conversationId);

  useEffect(() => {
    // In a full implementation, we'd fetch members via a new API endpoint.
    // Since we don't have one explicitly built for fetching members yet, we will just show a placeholder
    // or we can just render the UI. Let's assume we have it.
  }, [conversationId]);

  const handleLeaveGroup = async () => {
    // Implementation for Slice 9
    try {
        const me = await api.get('/auth/me');
        await api.delete(`/conversations/${conversationId}/members/${me.data.id}`);
        onClose();
        // optionally refresh convs or clear active
        window.location.reload();
    } catch(e) {
        console.error(e);
    }
  };

  if (!conversation) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-signal-darkPanel rounded-xl shadow-xl w-full max-w-md border border-transparent dark:border-signal-darkBorder text-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-signal-darkBorder">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-signal-blue" />
            Group Details
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#2B2B2B] rounded-full transition-colors text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 mx-auto flex items-center justify-center text-white text-3xl font-semibold">
            {conversation.display_name?.[0]?.toUpperCase() || '#'}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{conversation.display_name}</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">Group Conversation</p>

          <div className="flex gap-4 justify-center pt-4">
            <button 
              onClick={handleLeaveGroup}
              className="flex flex-col items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#2B2B2B] flex items-center justify-center">
                <UserMinus size={20} />
              </div>
              <span className="text-[12px] font-medium">Leave</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
