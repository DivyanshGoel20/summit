export default function Dashboard({ user, onLogout }) {
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src="/logo.png" alt="Summit logo" style={{ width: '36px', height: '36px' }} />
                Summit
              </h1>
            </div>
            <div className="header-right">
              <div className="user-info">
                <span>Welcome, {user?.name || 'User'} ({user?.role || 'user'})</span>
                <button onClick={onLogout} className="btn btn-secondary">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          <div className="hero">
            <h1>
              Welcome to your <span className="highlight">Dashboard</span>
            </h1>
            <p>
              You have successfully logged in to Summit.
            </p>
            <p>
              This is where your {user?.role === 'teacher' ? 'teaching' : 'learning'} journey begins. Explore our features and start your educational adventure.
            </p>
            <div className="dashboard-actions">
              <button className="btn btn-primary">
                {user?.role === 'teacher' ? 'Start Teaching' : 'Start Learning'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}