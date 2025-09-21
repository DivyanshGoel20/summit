import { useState, useEffect } from 'react'
import { chatService } from '../lib/chatService'
import ChatList from './ChatList'
import ChatWindow from './ChatWindow'
import ExploreUsers from './ExploreUsers'
import ErrorBoundary from './ErrorBoundary'

export default function Chat({ currentUser, onBack, startWithUser = null }) {
  const [currentView, setCurrentView] = useState('list') // 'list', 'chat', or 'explore'
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentConversation, setCurrentConversation] = useState(null)
  const [subscription, setSubscription] = useState(null)

  console.log('Chat component rendered with currentUser:', currentUser)
  console.log('Current view:', currentView)
  console.log('Start with user:', startWithUser)
  console.log('Available views: list, chat, explore')

  // Don't render if no currentUser
  if (!currentUser?.id) {
    return (
      <div className="app">
        <div className="chat-error">
          <h2>User Not Available</h2>
          <p>Please log in to access chat functionality.</p>
          <button onClick={onBack} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  useEffect(() => {
    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [subscription])

  // Auto-start chat if startWithUser is provided
  useEffect(() => {
    if (startWithUser && currentUser?.id) {
      console.log('Auto-starting chat with user:', startWithUser)
      handleStartChat(startWithUser)
    }
  }, [startWithUser, currentUser?.id])

  const handleStartChat = async (user, existingConversation = null) => {
    console.log('handleStartChat called with:', user, existingConversation)
    try {
      let conversation = existingConversation

      // If no existing conversation, create or get one
      if (!conversation) {
        console.log('Creating new conversation between:', currentUser.id, user.id)
        const { conversation: newConversation, error } = await chatService.getOrCreateConversation(
          currentUser.id,
          user.id
        )

        if (error) {
          console.error('Failed to create conversation:', error)
          return
        }

        conversation = newConversation
        console.log('Created conversation:', conversation)
      } else {
        console.log('Using existing conversation:', conversation)
      }

      setSelectedUser(user)
      setCurrentConversation(conversation)
      setCurrentView('chat')
    } catch (error) {
      console.error('Failed to start chat:', error)
    }
  }

  const handleCloseChat = () => {
    setCurrentView('list')
    setSelectedUser(null)
    setCurrentConversation(null)
  }

  const handleMessageSent = (message) => {
    // This can be used to update conversation list or show notifications
    console.log('Message sent:', message)
  }

  const handleBackToList = () => {
    setCurrentView('list')
  }

  const handleStartNewChat = () => {
    console.log('handleStartNewChat called, setting view to explore')
    console.log('Current view before:', currentView)
    setCurrentView('explore')
    console.log('View should now be set to explore')
  }

  const handleBackFromExplore = () => {
    setCurrentView('list')
  }

  if (currentView === 'chat' && selectedUser && currentConversation) {
    return (
      <div className="app">
        <ErrorBoundary>
          <ChatWindow
            currentUser={currentUser}
            otherUser={selectedUser}
            conversation={currentConversation}
            onClose={handleCloseChat}
            onMessageSent={handleMessageSent}
          />
        </ErrorBoundary>
      </div>
    )
  }

  if (currentView === 'explore') {
    return (
      <div className="app">
        <ErrorBoundary>
          <ExploreUsers 
            user={currentUser} 
            onBack={handleBackFromExplore} 
            onStartChat={handleStartChat} 
          />
        </ErrorBoundary>
      </div>
    )
  }

  return (
    <div className="app">
      <ErrorBoundary>
        <ChatList
          currentUser={currentUser}
          onStartChat={handleStartChat}
          onNewChat={handleStartNewChat}
          onBack={onBack}
        />
      </ErrorBoundary>
    </div>
  )
}
