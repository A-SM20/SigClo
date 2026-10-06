import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Conversation {
  id: number;
  is_group: boolean;
  name?: string;
  display_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  created_at?: string;
}

export interface UserContact {
  id: number;
  phone_number?: string;
  username?: string;
  display_name: string;
  avatar_url?: string;
}

interface ChatState {
  conversations: Conversation[];
  contacts: UserContact[];
  activeConversationId: number | null;
  messages: Record<number, any[]>;
  isLoadingConversations: boolean;
  isLoadingContacts: boolean;
  
  fetchConversations: () => Promise<void>;
  fetchContacts: () => Promise<void>;
  setActiveConversation: (id: number | null) => void;
  createConversation: (contactId: number) => Promise<Conversation>;
  createGroupConversation: (name: string, memberIds: number[]) => Promise<Conversation>;
  fetchMessages: (conversationId: number) => Promise<void>;
  addMessage: (message: any) => void;
  updateMessageReceipt: (conversationId: number, messageId: number, userId: number, status: 'delivered' | 'read') => void;
  typingUsers: Record<number, number[]>; // conversationId -> array of userIds typing
  setTyping: (conversationId: number, userId: number, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  contacts: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  isLoadingConversations: false,
  isLoadingContacts: false,

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await api.get('/conversations');
      set({ conversations: res.data });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (conversationId: number) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: res.data
        }
      }));
    } catch (e) {
      console.error(e);
    }
  },

  addMessage: (message: any) => {
    const convId = message.conversation_id;
    set((state) => {
      const existing = state.messages[convId] || [];
      // update conversation last_message
      const convs = state.conversations.map(c => {
        if (c.id === convId) {
          return { ...c, last_message: message.content, last_message_at: message.created_at };
        }
        return c;
      });
      // Sort conversations again to bubble the updated one to the top
      convs.sort((a, b) => {
        const da = a.last_message_at || a.created_at || '';
        const db = b.last_message_at || b.created_at || '';
        return da < db ? 1 : da > db ? -1 : 0;
      });

      // Avoid duplicate messages if sender already added it instantly
      const alreadyExists = existing.find(m => m.id === message.id);
      if (alreadyExists) return { conversations: convs };
      
      return {
        messages: {
          ...state.messages,
          [convId]: [...existing, message]
        },
        conversations: convs
      };
    });
  },

  fetchContacts: async () => {
    set({ isLoadingContacts: true });
    try {
      const res = await api.get('/contacts');
      set({ contacts: res.data });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoadingContacts: false });
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
  },

  createConversation: async (contactId) => {
    const res = await api.post('/conversations', { contact_id: contactId });
    const newConv = res.data;
    
    // Add to top of list if not already there
    const convs = get().conversations;
    if (!convs.find(c => c.id === newConv.id)) {
      set({ conversations: [newConv, ...convs] });
    }
    
    set({ activeConversationId: newConv.id });
    return newConv;
  },

  createGroupConversation: async (name, memberIds) => {
    const res = await api.post('/conversations/group', { name, member_ids: memberIds });
    const newConv = res.data;
    
    // Add to top of list if not already there
    const convs = get().conversations;
    if (!convs.find(c => c.id === newConv.id)) {
      set({ conversations: [newConv, ...convs] });
    }
    
    set({ activeConversationId: newConv.id });
    return newConv;
  },

  updateMessageReceipt: (conversationId, messageId, userId, status) => {
    set((state) => {
      const existing = state.messages[conversationId];
      if (!existing) return state;

      const updated = existing.map(msg => {
        if (msg.id === messageId) {
          const receipts = msg.receipts || {};
          return {
            ...msg,
            receipts: {
              ...receipts,
              [userId]: status
            }
          };
        }
        return msg;
      });

      return {
        messages: {
          ...state.messages,
          [conversationId]: updated
        }
      };
    });
  },

  setTyping: (conversationId, userId, isTyping) => {
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping 
        ? (current.includes(userId) ? current : [...current, userId])
        : current.filter(id => id !== userId);
        
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: updated
        }
      };
    });
  }
}));
