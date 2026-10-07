import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { UserContact, useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Search, UserPlus, X, Users, Edit, LogOut, Settings } from 'lucide-react';
import { CreateGroupModal } from './CreateGroupModal';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { conversations, activeConversationId, setActiveConversation, createConversation } = useChatStore();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserContact[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  return (
    <div className="w-full flex-col bg-white dark:bg-signal-dark flex h-full">
      <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-signal-darkBorder gap-3">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
            className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-semibold flex-shrink-0 hover:ring-2 hover:ring-blue-500 transition-all"
            title="Profile & Settings"
          >
            {user?.display_name?.[0]?.toUpperCase() || 'U'}
          </button>
          
          {showSettingsDropdown && (
            <div className="absolute top-10 left-0 w-64 bg-white dark:bg-signal-darkPanel rounded-lg shadow-lg border border-gray-100 dark:border-signal-darkBorder py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-signal-darkBorder mb-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.display_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.phone_number || user?.username}</p>
              </div>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2B2B2B] flex items-center gap-3 transition-colors"
              >
                <Settings size={16} />
                Settings
              </button>
              
              <button 
                onClick={() => {
                  setShowSettingsDropdown(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
        
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-[6px] border-none rounded-md bg-gray-100 dark:bg-signal-darkPanel dark:text-white placeholder-gray-500 focus:bg-white dark:focus:bg-signal-dark focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors outline-none"
            placeholder="Search"
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
              <X size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowCreateGroup(true)}
          className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-signal-darkPanel rounded-full transition-colors flex-shrink-0"
          title="Compose"
        >
          <Edit size={18} />
        </button>
      </div>

      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isSearching && searchQuery ? (
          <div className="p-2">
            <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Global Search Results
            </h3>
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">No users found.</p>
            ) : (
              searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => startChat(user.id)}
                  className="w-full flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-signal-darkPanel rounded-md transition-colors gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 flex-shrink-0">
                    <UserPlus size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[15px] font-medium text-gray-900 dark:text-signal-textDark truncate">{user.display_name}</p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">{user.phone_number || user.username}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="p-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400 text-sm">
                <p>No conversations yet.</p>
                <p>Search for a user to start chatting.</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`w-full flex items-center px-3 py-3 rounded-md transition-colors gap-3 ${
                    activeConversationId === conv.id ? 'bg-[#E5E5E5] dark:bg-[#2D2D2D]' : 'hover:bg-gray-100 dark:hover:bg-signal-darkPanel'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center text-white flex-shrink-0 text-lg font-semibold">
                    {conv.display_name?.[0]?.toUpperCase() || '#'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-baseline mb-[2px]">
                      <p className={`text-[15px] truncate pr-2 ${activeConversationId === conv.id ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-900 dark:text-signal-textDark'}`}>
                        {conv.display_name}
                      </p>
                      {conv.last_message_at && (
                        <p className={`text-[12px] flex-shrink-0 ${activeConversationId === conv.id ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <p className={`text-[13px] truncate ${activeConversationId === conv.id ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
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
