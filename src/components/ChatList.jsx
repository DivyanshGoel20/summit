import { useState, useEffect } from 'react'
import { chatService } from '../lib/chatService'

export default function ChatList({ currentUser, onStartChat, onBack }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!currentUser?.id) {
      console.log('No currentUser.id available, skipping chat operations')
      return
    }
    
    loadConversations()
    loadUnreadCount()
    subscribeToUpdates()

    return () => {
      // Cleanup subscription will be handled in the component that mounts this
    }
  }, [currentUser?.id])

  const loadConversations = async () => {
    try {
      setLoading(true)
      console.log('Loading conversations for user:', currentUser?.id)
      
      if (!currentUser?.id) {
        console.error('No currentUser.id available for loadConversations')
        setError('User not available')
        return
      }
      
      const { conversations: userConversations, error } = await chatService.getUserConversations(currentUser.id)
      
      if (error) {
        console.error('Error loading conversations:', error)
        setError('Failed to load conversations')
        return
      }

      console.log('Loaded conversations:', userConversations)
      
      // Load last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        (userConversations || []).map(async (conversation) => {
          try {
            const lastMessage = await getLastMessage(conversation.id)
            return {
              ...conversation,
              last_message: lastMessage ? lastMessage.content : 'No messages yet'
            }
          } catch (error) {
            console.error('Error loading last message for conversation:', conversation.id, error)
            return {
              ...conversation,
              last_message: 'No messages yet'
            }
          }
        })
      )

      setConversations(conversationsWithLastMessage)
    } catch (error) {
      console.error('Exception loading conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      if (!currentUser?.id) {
        console.error('No currentUser.id available for loadUnreadCount')
        return
      }
      
      const { count } = await chatService.getUnreadCount(currentUser.id)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  const subscribeToUpdates = () => {
    if (!currentUser?.id) {
      console.error('No currentUser.id available for subscribeToUpdates')
      return null
    }
    
    const subscription = chatService.subscribeToConversationList(
      currentUser.id,
      () => {
        // Reload conversations when there are updates
        loadConversations()
        loadUnreadCount()
      }
    )

    return subscription
  }

  const getOtherUser = (conversation) => {
    if (conversation.participant1_id === currentUser.id) {
      return conversation.participant2
    }
    return conversation.participant1
  }

  const getLastMessage = async (conversationId) => {
    try {
      const { messages, error } = await chatService.getConversationMessages(conversationId, 1)
      if (error) {
        console.error('Error getting last message:', error)
        return null
      }
      return messages && messages.length > 0 ? messages[0] : null
    } catch (error) {
      console.error('Exception getting last message:', error)
      return null
    }
  }

  const formatLastMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const handleStartChat = (conversation) => {
    const otherUser = getOtherUser(conversation)
    if (onStartChat) {
      onStartChat(otherUser, conversation)
    }
  }

  if (loading) {
    return (
      <div className="chat-list">
        <div className="chat-list-header">
          <button onClick={onBack} className="back-btn">
            ← Back
          </button>
          <h2>Messages</h2>
        </div>
        <div className="chat-loading">
          <p>Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>
        <h2>Messages {unreadCount > 0 && `(${unreadCount})`}</h2>
        <button 
          onClick={() => onNewChat && onNewChat()} 
          className="btn btn-primary btn-small new-chat-btn"
        >
          + New Chat
        </button>
      </div>

      {error && (
        <div className="chat-error">
          <p>{error}</p>
        </div>
      )}

      <div className="conversations-list">
        {conversations.length === 0 ? (
          <div className="chat-empty">
            <p>No conversations yet. Start chatting with someone!</p>

          </div>
        ) : (
          conversations.map((conversation) => {
            const otherUser = getOtherUser(conversation)
            return (
              <div
                key={conversation.id}
                className="conversation-item"
                onClick={() => {
                  const otherUser = getOtherUser(conversation)
                  if (otherUser) {
                    handleStartChat(otherUser, conversation)
                  }
                }}
              >
                <div className="conversation-avatar">
                  <span className="avatar-icon">👤</span>
                </div>
                <div className="conversation-details">
                  <div className="conversation-header">
                    <h4>{otherUser?.name || 'Unknown User'}</h4>
                    <span className="conversation-time">
                      {formatLastMessageTime(conversation.updated_at)}
                    </span>
                  </div>
                  <p className="conversation-preview">
                    {conversation.last_message || 'No messages yet'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
