import { useState, useEffect } from 'react'
import { auth } from './lib/auth'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import Dashboard from './components/Dashboard'
import StudentDashboard from './components/StudentDashboard'
import TeacherDashboard from './components/TeacherDashboard'
import { startDeadlineChecker, stopDeadlineChecker } from './utils/deadlineChecker'
import './index.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home') // 'home', 'login', 'signup', 'dashboard'
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
    
    // Start deadline checker (checks every 5 minutes)
    startDeadlineChecker(5)
    
    // Cleanup on unmount
    return () => {
      stopDeadlineChecker()
    }
  }, [])

  const checkUser = () => {
    const currentUser = auth.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      setCurrentPage('dashboard')
    }
    setLoading(false)
  }

  const handleGetStarted = () => {
    setCurrentPage('login')
  }

  const handleSwitchToSignup = () => {
    setCurrentPage('signup')
  }

  const handleSwitchToLogin = () => {
    setCurrentPage('login')
  }

  const handleLogin = (data) => {
    setUser(data.user)
    setCurrentPage('dashboard')
  }

  const handleSignup = (data) => {
    setUser(data.user)
    setCurrentPage('dashboard')
  }

  const handleLogout = () => {
    auth.signOut()
    setUser(null)
    setCurrentPage('home')
  }

  if (loading) {
    return (
      <div className="app">
        <div className="main">
          <div className="container">
            <div className="hero">
              <h1>Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} onSwitchToSignup={handleSwitchToSignup} />
  }

  if (currentPage === 'signup') {
    return <SignupPage onSignup={handleSignup} onSwitchToLogin={handleSwitchToLogin} />
  }

  if (currentPage === 'dashboard') {
    // Show different dashboard based on user role
    if (user?.role === 'teacher') {
      return <TeacherDashboard user={user} onLogout={handleLogout} />
    } else if (user?.role === 'student') {
      return <StudentDashboard user={user} onLogout={handleLogout} />
    } else {
      return <Dashboard user={user} onLogout={handleLogout} />
    }
  }

  // Home page
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.png" alt="Summit logo" style={{ width: '40px', height: '40px' }} />
            Summit
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          <div className="hero">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <img src="/logo.png" alt="Summit logo large" style={{ width: '140px', height: '140px' }} />
            </div>
            <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
              <span className="highlight" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Welcome to Summit
              </span>
            </h1>
            <p>
              Your gateway to innovative education technology.
            </p>
            <p>
              Join our community of learners and educators who are shaping the future of digital learning.
            </p>
            <button className="btn" onClick={handleGetStarted}>
              Get started
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}