export default function Dashboard({ user, onLogout }) {
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1>VirtuHack</h1>
            <div className="user-info">
              <span>Welcome, {user?.name || 'User'} ({user?.role || 'user'})</span>
              <button onClick={onLogout} className="btn btn-secondary">
                Logout
              </button>
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
              You have successfully logged in to VirtuHack.
            </p>
            <p>
              This is where your learning journey begins. Explore our features and start your educational adventure.
            </p>
            <div className="dashboard-actions">
              <button className="btn btn-primary">
                Start Learning
              </button>
              <button className="btn btn-outline">
                Explore Courses
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}