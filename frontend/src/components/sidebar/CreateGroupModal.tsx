import { useState } from 'react';
import { useChatStore, UserContact } from '@/stores/useChatStore';
import { api } from '@/lib/api';
import { X, Search, Check, Users } from 'lucide-react';

interface CreateGroupModalProps {
  onClose: () => void;
}

export function CreateGroupModal({ onClose }: CreateGroupModalProps) {
  const { createGroupConversation } = useChatStore();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserContact[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/users/search?query=${query}`);
      // Filter out already selected users
      const filtered = res.data.filter(
        (u: UserContact) => !selectedUsers.find(s => s.id === u.id)
      );
      setSearchResults(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleUser = (user: UserContact) => {
    const isSelected = selectedUsers.find(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    setIsLoading(true);
    try {
      const memberIds = selectedUsers.map(u => u.id);
      await createGroupConversation(groupName, memberIds);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-blue-500" />
            Create New Group
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g. Weekend Trip"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Add Members</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Search by name or phone"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Selected Users Pills */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedUsers.map(u => (
                <div key={u.id} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  {u.display_name}
                  <button onClick={() => toggleUser(u)} className="hover:text-blue-900 ml-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="border border-gray-100 rounded-lg max-h-48 overflow-y-auto shadow-sm">
              {searchResults.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">No users found.</div>
              ) : (
                searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{u.display_name}</p>
                      <p className="text-xs text-gray-500">{u.phone_number || u.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedUsers.length === 0 || isLoading}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            {isLoading ? 'Creating...' : (
              <>
                <Check size={16} />
                Create Group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
