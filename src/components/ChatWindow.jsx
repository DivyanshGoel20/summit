import { useState, useEffect, useRef } from 'react'
import { chatService } from '../lib/chatService'

export default function ChatWindow({ 
  currentUser, 
  otherUser, 
  conversation, 
  onClose, 
  onMessageSent 
}) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const messagesEndRef = useRef(null)
  const subscriptionRef = useRef(null)
  const fileInputRef = useRef(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation?.id) {
      loadMessages()
      subscribeToMessages()
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [conversation?.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const { messages: conversationMessages, error } = await chatService.getConversationMessages(conversation.id)
      
      if (error) {
        setError('Failed to load messages')
        return
      }

      setMessages(conversationMessages || [])
      
      // Mark messages as read
      await chatService.markMessagesAsRead(conversation.id, currentUser.id)
    } catch (error) {
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    subscriptionRef.current = chatService.subscribeToConversation(
      conversation.id,
      (newMessage) => {
        setMessages(prev => [...prev, newMessage])
        
        // Mark as read if it's not from current user
        if (newMessage.sender_id !== currentUser.id) {
          chatService.markMessagesAsRead(conversation.id, currentUser.id)
        }
      }
    )
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const getFileType = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
    if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) return 'video'
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio'
    if (['pdf'].includes(ext)) return 'pdf'
    return 'file'
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if ((!newMessage.trim() && !selectedFile) || sending || uploading) return

    try {
      setSending(true)
      setError(null)

      let fileData = null
      let messageType = 'text'
      let content = newMessage.trim()

      // Handle file upload
      if (selectedFile) {
        setUploading(true)
        const uploadResult = await chatService.uploadFile(selectedFile, conversation.id)
        
        if (uploadResult.error) {
          setError('Failed to upload file')
          setUploading(false)
          return
        }

        fileData = uploadResult
        messageType = getFileType(selectedFile.name)
        content = selectedFile.name // Use filename as content for file messages
      }

      const { message, error } = await chatService.sendMessage(
        conversation.id,
        currentUser.id,
        content,
        messageType,
        fileData
      )

      if (error) {
        setError('Failed to send message')
        return
      }

      setMessages(prev => [...prev, message])
      setNewMessage('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Notify parent component
      if (onMessageSent) {
        onMessageSent(message)
      }
    } catch (error) {
      setError('Failed to send message')
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-user-info">
            <div className="user-avatar">
              <span className="avatar-icon">👤</span>
            </div>
            <div className="user-details">
              <h3>{otherUser?.name || 'Unknown User'}</h3>
              <p>{otherUser?.role || 'User'}</p>
            </div>
          </div>
          <button onClick={onClose} className="chat-close-btn">
            ✕
          </button>
        </div>
        <div className="chat-loading">
          <p>Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="user-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="user-details">
            <h3>{otherUser?.name || 'Unknown User'}</h3>
            <p>{otherUser?.role || 'User'}</p>
          </div>
        </div>
        <button onClick={onClose} className="chat-close-btn">
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender_id === currentUser.id ? 'message-sent' : 'message-received'}`}
            >
              <div className="message-content">
                {message.message_type === 'text' ? (
                  <p>{message.content}</p>
                ) : message.message_type === 'image' ? (
                  <div className="file-message">
                    <img 
                      src={message.file_url} 
                      alt={message.content}
                      className="message-image"
                      onClick={() => window.open(message.file_url, '_blank')}
                    />
                    <p className="file-name">{message.content}</p>
                  </div>
                ) : message.message_type === 'video' ? (
                  <div className="file-message">
                    <video 
                      src={message.file_url} 
                      controls
                      className="message-video"
                    />
                    <p className="file-name">{message.content}</p>
                  </div>
                ) : message.message_type === 'audio' ? (
                  <div className="file-message">
                    <audio 
                      src={message.file_url} 
                      controls
                      className="message-audio"
                    />
                    <p className="file-name">{message.content}</p>
                  </div>
                ) : (
                  <div className="file-message">
                    <div className="file-preview">
                      <span className="file-icon">
                        {message.message_type === 'pdf' ? '📄' : '📎'}
                      </span>
                      <div className="file-info">
                        <p className="file-name">{message.content}</p>
                        <p className="file-size">
                          {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                    </div>
                    <a 
                      href={message.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="file-download-btn"
                    >
                      Download
                    </a>
                  </div>
                )}
                <span className="message-time">
                  {formatTime(message.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          <p>{error}</p>
        </div>
      )}

      {selectedFile && (
        <div className="file-preview-bar">
          <div className="file-preview">
            <span className="file-icon">
              {getFileType(selectedFile.name) === 'image' ? '🖼️' : 
               getFileType(selectedFile.name) === 'video' ? '🎥' :
               getFileType(selectedFile.name) === 'audio' ? '🎵' :
               getFileType(selectedFile.name) === 'pdf' ? '📄' : '📎'}
            </span>
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button 
            type="button"
            onClick={() => {
              setSelectedFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
            className="file-remove-btn"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <div className="chat-input-container">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="file-input"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="file-attach-btn"
            disabled={sending || uploading}
            title="Attach file"
          >
            📎
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
            disabled={sending || uploading}
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}
            className="chat-send-btn"
          >
            {uploading ? 'Uploading...' : sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
