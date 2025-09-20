import { useState, useEffect } from 'react'
import { todoService } from '../lib/database'

export default function StudentDashboard({ user, onLogout }) {
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)

  // Load todos from database
  useEffect(() => {
    if (user?.id) {
      loadTodos()
    }
  }, [user?.id])

  const loadTodos = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { todos: userTodos } = await todoService.getUserTodos(user.id)
      setTodos(userTodos || [])
    } catch (error) {
      console.error('Error loading todos:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async (e) => {
    e.preventDefault()
    if (newTodo.trim() && user?.id) {
      try {
        const { todo } = await todoService.createTodo({
          user_id: user.id,
          title: newTodo.trim(),
          description: '',
          completed: false,
          priority: 'medium'
        })
        setTodos([todo, ...todos])
        setNewTodo('')
      } catch (error) {
        console.error('Error adding todo:', error)
        alert('Failed to add todo. Please try again.')
      }
    }
  }

  const toggleTodo = async (id) => {
    try {
      const { todo } = await todoService.toggleTodo(id)
      setTodos(todos.map(t => t.id === id ? todo : t))
    } catch (error) {
      console.error('Error toggling todo:', error)
      alert('Failed to update todo. Please try again.')
    }
  }

  const deleteTodo = async (id) => {
    try {
      await todoService.deleteTodo(id)
      setTodos(todos.filter(todo => todo.id !== id))
    } catch (error) {
      console.error('Error deleting todo:', error)
      alert('Failed to delete todo. Please try again.')
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1>VirtuHack</h1>
            <div className="user-info">
              <span>Welcome, {user?.name || 'User'} (Student)</span>
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
          <div className="student-dashboard">
            {/* Welcome Section */}
            <div className="welcome-section">
              <h1>
                Welcome to your <span className="highlight">Learning Dashboard</span>
              </h1>
              <p>
                This is where your learning journey begins. Track your progress and manage your tasks.
              </p>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
              {/* Learning Progress Section */}
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>Learning Progress</h3>
                  <span className="progress-count">Coming Soon</span>
                </div>
                <div className="progress-content">
                  <p className="empty-state">Your learning progress will be tracked here as you enroll in courses.</p>
                </div>
              </div>

              {/* To-Do List Section */}
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>My Tasks</h3>
                  <span className="todo-count">{todos.filter(t => !t.completed).length} pending</span>
                </div>
                
                {/* Add Todo Form */}
                <form onSubmit={addTodo} className="todo-form">
                  <div className="todo-input-group">
                    <input
                      type="text"
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      placeholder="Add a new task..."
                      className="todo-input"
                    />
                    <button type="submit" className="btn btn-primary btn-small">
                      Add
                    </button>
                  </div>
                </form>

                {/* Todo List */}
                <div className="todo-list">
                  {loading ? (
                    <p className="loading-state">Loading todos...</p>
                  ) : todos.length === 0 ? (
                    <p className="empty-state">No tasks yet. Add one above!</p>
                  ) : (
                    todos.map(todo => (
                      <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                        <div className="todo-content">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                            className="todo-checkbox"
                          />
                          <span className="todo-text">{todo.title}</span>
                        </div>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="todo-delete"
                          title="Delete task"
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
