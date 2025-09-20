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
      
      // Get all users except the current user
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, name, username, role, created_at')
        .neq('id', user?.id)
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
            className={`filter-btn ${filter === 'students' ? 'active' : ''}`}
            onClick={() => setFilter('students')}
          >
            Students
          </button>
          <button
            className={`filter-btn ${filter === 'teachers' ? 'active' : ''}`}
            onClick={() => setFilter('teachers')}
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
          {filteredUsers.map(user => (
            <div key={user.id} className="user-card">
              <div className="user-avatar">
                <span className="avatar-icon" style={{ color: getRoleColor(user.role) }}>
                  {getRoleIcon(user.role)}
                </span>
              </div>
              
              <div className="user-info">
                <h3 className="user-name">{user.name}</h3>
                <p className="user-username">@{user.username}</p>
                <div className="user-role">
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(user.role) }}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="user-joined">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="user-actions">
                <button
                  onClick={() => handleStartChat(user)}
                  className="btn btn-primary btn-small"
                >
                  💬 Start Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="users-stats">
        <div className="stat-item">
          <span className="stat-number">{users.filter(u => u.role === 'students').length}</span>
          <span className="stat-label">Students</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{users.filter(u => u.role === 'teachers').length}</span>
          <span className="stat-label">Teachers</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{users.length}</span>
          <span className="stat-label">Total Users</span>
        </div>
      </div>
    </div>
  )
}
