import { useState, useEffect } from 'react'
import { auth } from './lib/auth'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import Dashboard from './components/Dashboard'
import './index.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home') // 'home', 'login', 'signup', 'dashboard'
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
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
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  // Home page
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <h1>VirtuHack</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          <div className="hero">
            <h1>
              Welcome to <span className="highlight">VirtuHack</span>
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