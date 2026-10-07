import { useState } from 'react';
import { api } from '@/lib/api';
import { UserContact, useChatStore } from '@/stores/useChatStore';
import { Search, UserPlus, X, Users, MessageCircle } from 'lucide-react';
import { CreateGroupModal } from './CreateGroupModal';

export function Sidebar() {
  const { conversations, activeConversationId, setActiveConversation, createConversation } = useChatStore();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserContact[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/users/search?query=${query}`);
      setSearchResults(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const startChat = async (userId: number) => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    await createConversation(userId);
  };

  return (
    <div className="w-full flex-col bg-white flex h-full">
      <div className="h-16 flex items-center px-4 border-b border-gray-200 gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
            placeholder="Search or start chat"
            value={searchQuery}
            onChange={(e) => {
              setIsSearching(true);
              handleSearch(e.target.value);
            }}
          />
          {isSearching && searchQuery && (
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => {
                setSearchQuery('');
                setIsSearching(false);
                setSearchResults([]);
              }}
            >
              <X size={16} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowCreateGroup(true)}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
          title="New Group"
        >
          <Users size={20} />
        </button>
      </div>

      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
      )}

      <div className="flex-1 overflow-y-auto">
        {isSearching && searchQuery ? (
          <div className="p-2">
            <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Global Search Results
            </h3>
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">No users found.</p>
            ) : (
              searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => startChat(user.id)}
                  className="w-full flex items-center px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <UserPlus size={20} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.display_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.phone_number || user.username}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="p-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
                <p>No conversations yet.</p>
                <p>Search for a user to start chatting.</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors gap-3 ${
                    activeConversationId === conv.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center text-white flex-shrink-0 text-lg font-semibold">
                    {conv.display_name?.[0]?.toUpperCase() || '#'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-base font-medium text-gray-900 truncate pr-2">
                        {conv.display_name}
                      </p>
                      {conv.last_message_at && (
                        <p className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.last_message || "No messages yet"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
