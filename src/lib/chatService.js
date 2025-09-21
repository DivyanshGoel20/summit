import { supabase } from './supabase'

class ChatService {
  // Get or create a conversation between two users
  async getOrCreateConversation(user1Id, user2Id) {
    try {
      // First, try to find existing conversation (check both directions)
      const { data: existingConversation, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user1Id},participant1_id.eq.${user2Id}`)
        .or(`participant2_id.eq.${user1Id},participant2_id.eq.${user2Id}`)
        .single()

      if (existingConversation && !findError) {
        return { conversation: existingConversation, error: null }
      }

      // If no existing conversation, create a new one
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([
          {
            participant1_id: Math.min(user1Id, user2Id),
            participant2_id: Math.max(user1Id, user2Id)
          }
        ])
        .select()
        .single()

      if (createError) {
        return { conversation: null, error: createError }
      }

      return { conversation: newConversation, error: null }
    } catch (error) {
      return { conversation: null, error }
    }
  }

  // Get all conversations for a user
  async getUserConversations(userId) {
    try {
      console.log('Getting conversations for user:', userId)
      
      // First get conversations where user is participant1
      const { data: conversations1, error: error1 } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:users!conversations_participant1_id_fkey(*),
          participant2:users!conversations_participant2_id_fkey(*)
        `)
        .eq('participant1_id', userId)

      // Then get conversations where user is participant2
      const { data: conversations2, error: error2 } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:users!conversations_participant1_id_fkey(*),
          participant2:users!conversations_participant2_id_fkey(*)
        `)
        .eq('participant2_id', userId)

      if (error1 || error2) {
        console.error('Error loading conversations:', error1 || error2)
        return { conversations: [], error: error1 || error2 }
      }

      // Combine and sort conversations
      const allConversations = [...(conversations1 || []), ...(conversations2 || [])]
      allConversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

      console.log('Found conversations:', allConversations)
      return { conversations: allConversations, error: null }
    } catch (error) {
      console.error('Exception in getUserConversations:', error)
      return { conversations: [], error }
    }
  }

  // Get messages for a conversation
  async getConversationMessages(conversationId, limit = 50, offset = 0) {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { messages: [], error }
      }

      return { messages: (messages || []).reverse(), error: null }
    } catch (error) {
      return { messages: [], error }
    }
  }

  // Upload file (convert to base64 for now since storage bucket doesn't exist)
  async uploadFile(file, conversationId) {
    try {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            url: reader.result, // Base64 data URL
            name: file.name,
            size: file.size,
            error: null
          })
        }
        reader.onerror = () => {
          resolve({
            url: null,
            name: file.name,
            size: file.size,
            error: 'Failed to read file'
          })
        }
        reader.readAsDataURL(file)
      })
    } catch (error) {
      return { url: null, error: error.message }
    }
  }

  // Send a message
  async sendMessage(conversationId, senderId, content, messageType = 'text', fileData = null) {
    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType
      }

      // Add file data if provided
      if (fileData) {
        messageData.file_url = fileData.url
        messageData.file_name = fileData.name
        messageData.file_size = fileData.size
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*)
        `)
        .single()

      if (error) {
        return { message: null, error }
      }

      // Update conversation's updated_at timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      return { message, error: null }
    } catch (error) {
      return { message: null, error }
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId, userId) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  // Get unread message count for a user
  async getUnreadCount(userId) {
    try {
      // Get all conversations for the user
      const { conversations } = await this.getUserConversations(userId)
      
      let totalUnread = 0
      
      for (const conversation of conversations) {
        const { data: unreadMessages, error } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conversation.id)
          .eq('is_read', false)
          .neq('sender_id', userId)

        if (!error && unreadMessages) {
          totalUnread += unreadMessages.length
        }
      }

      return { count: totalUnread, error: null }
    } catch (error) {
      return { count: 0, error }
    }
  }

  // Subscribe to real-time updates for a conversation
  subscribeToConversation(conversationId, callback) {
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Fetch the full message with sender info
          this.getMessageWithSender(payload.new.id).then(({ message, error }) => {
            if (!error && message) {
              callback(message)
            }
          })
        }
      )
      .subscribe()

    return subscription
  }

  // Get a single message with sender info
  async getMessageWithSender(messageId) {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*)
        `)
        .eq('id', messageId)
        .single()

      return { message, error }
    } catch (error) {
      return { message: null, error }
    }
  }

  // Subscribe to conversation list updates
  subscribeToConversationList(userId, callback) {
    const subscription = supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant1_id=eq.${userId},participant2_id=eq.${userId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          // Check if this message belongs to any of user's conversations
          this.checkMessageBelongsToUser(payload.new.conversation_id, userId)
            .then((belongs) => {
              if (belongs) {
                callback(payload)
              }
            })
        }
      )
      .subscribe()

    return subscription
  }

  // Check if a conversation belongs to a user
  async checkMessageBelongsToUser(conversationId, userId) {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversationId)
        .single()

      if (error || !conversation) {
        return false
      }

      return conversation.participant1_id === userId || conversation.participant2_id === userId
    } catch (error) {
      return false
    }
  }
}

export const chatService = new ChatService()
