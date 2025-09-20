import { useState } from 'react'
import { auth } from '../lib/auth'

export default function SignupPage({ onSignup, onSwitchToLogin }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    // Validate name length
    if (name.length < 2) {
      setError('Name must be at least 2 characters')
      setLoading(false)
      return
    }

    // Validate username length
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      setLoading(false)
      return
    }

    // Validate username format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores')
      setLoading(false)
      return
    }

    try {
      const { user } = await auth.signUp(name, username, password, role)
      onSignup({ user })
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up to get started</p>
        
        <form onSubmit={handleSignup} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your full name"
              minLength="2"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose a unique username"
              minLength="3"
              pattern="[a-zA-Z0-9_]+"
            />
            <small className="form-hint">Letters, numbers, and underscores only</small>
          </div>

          <div className="form-group">
            <label>I am a...</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-option ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
              >
                <div className="role-icon">🎓</div>
                <span>Student</span>
              </button>
              <button
                type="button"
                className={`role-option ${role === 'teacher' ? 'active' : ''}`}
                onClick={() => setRole('teacher')}
              >
                <div className="role-icon">👨‍🏫</div>
                <span>Teacher</span>
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
              minLength="6"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-switch">
          <p>Already have an account? <button onClick={onSwitchToLogin} className="link-btn">Sign in</button></p>
        </div>
      </div>
    </div>
  )
}