import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ExploreUsers({ user, onBack, onStartChat }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'students', 'teachers'
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Get all users including the current user
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, name, username, role, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(allUsers || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getRoleIcon = (role) => {
    return role === 'teacher' ? '👨‍🏫' : '🎓'
  }

  const getRoleColor = (role) => {
    return role === 'teacher' ? '#3b82f6' : '#10b981'
  }

  const handleStartChat = (targetUser) => {
    onStartChat(targetUser)
  }

  const isCurrentUser = (userId) => {
    return userId === user?.id
  }

  return (
    <div className="explore-users">
      <div className="explore-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Dashboard
        </button>
        <h1>Explore Users</h1>
        <p>Connect with students and teachers on the platform</p>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Users
          </button>
          <button
            className={`filter-btn ${filter === 'student' ? 'active' : ''}`}
            onClick={() => setFilter('student')}
          >
            Students
          </button>
          <button
            className={`filter-btn ${filter === 'teacher' ? 'active' : ''}`}
            onClick={() => setFilter('teacher')}
          >
            Teachers
          </button>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="loading-container">
          <p className="loading-state">Loading users...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={loadUsers} className="btn btn-primary">
            Try Again
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-container">
          <p className="empty-state">
            {searchTerm ? 'No users found matching your search.' : 'No users available at the moment.'}
          </p>
        </div>
      ) : (
        <div className="users-grid">
          {filteredUsers.map(userItem => (
            <div key={userItem.id} className={`user-card ${isCurrentUser(userItem.id) ? 'current-user' : ''}`}>
              <div className="user-avatar">
                <span className="avatar-icon" style={{ color: getRoleColor(userItem.role) }}>
                  {getRoleIcon(userItem.role)}
                </span>
                {isCurrentUser(userItem.id) && (
                  <div className="current-user-badge">You</div>
                )}
              </div>
              
              <div className="user-info">
                <div className="user-details-row">
                  <div className="user-name-section">
                    <h3 className="user-name">{userItem.name}</h3>
                    <p className="user-username">@{userItem.username}</p>
                  </div>
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(userItem.role) }}
                  >
                    {userItem.role}
                  </span>
                  <div className="user-joined-section">
                    <p className="user-joined">Joined</p>
                    <p className="user-joined-date">
                      {new Date(userItem.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="user-actions">
                {isCurrentUser(userItem.id) ? (
                  <button className="btn btn-secondary btn-small" disabled>
                    👤 This is you
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartChat(userItem)}
                    className="btn btn-primary btn-small"
                  >
                    💬 Start Chat
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
