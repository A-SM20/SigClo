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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-blue-500" />
            Group Details
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 mx-auto flex items-center justify-center text-white text-3xl font-semibold">
            {conversation.display_name?.[0]?.toUpperCase() || '#'}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{conversation.display_name}</h3>
          <p className="text-sm text-gray-500">Group Conversation</p>

          <div className="flex gap-3 justify-center pt-4">
            <button className="flex flex-col items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <UserPlus size={18} />
              </div>
              <span className="text-xs font-medium">Add</span>
            </button>
            <button 
              onClick={handleLeaveGroup}
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-red-600 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <UserMinus size={18} />
              </div>
              <span className="text-xs font-medium">Leave</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
