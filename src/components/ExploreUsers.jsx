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
        <div className="users-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
          padding: '1rem 0'
        }}>
          {filteredUsers.map(userItem => (
            <div key={userItem.id} className={`user-card ${isCurrentUser(userItem.id) ? 'current-user' : ''}`} style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Current User Badge */}
              {isCurrentUser(userItem.id) && (
                <div style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  You
                </div>
              )}

              {/* Avatar Section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: getRoleColor(userItem.role) + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '1rem'
                }}>
                  <span style={{ 
                    fontSize: '1.5rem',
                    color: getRoleColor(userItem.role)
                  }}>
                    {getRoleIcon(userItem.role)}
                  </span>
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: '0 0 0.25rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#111827'
                  }}>
                    {userItem.name}
                  </h3>
                  <p style={{
                    margin: '0',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    @{userItem.username}
                  </p>
                </div>
              </div>

              {/* Role Badge */}
              <div style={{ marginBottom: '1rem' }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: getRoleColor(userItem.role),
                  color: 'white',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {userItem.role}
                </span>
              </div>

              {/* Joined Date */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #f3f4f6'
              }}>
                <p style={{
                  margin: '0',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Joined {new Date(userItem.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Action Button */}
              <div>
                {isCurrentUser(userItem.id) ? (
                  <button 
                    className="btn btn-secondary" 
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      opacity: '0.6',
                      cursor: 'not-allowed'
                    }}
                  >
                    👤 This is you
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartChat(userItem)}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
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
