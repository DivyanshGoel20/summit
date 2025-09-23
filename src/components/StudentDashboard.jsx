import { useState, useEffect } from 'react'
import { todoService, enrollmentService } from '../lib/database'
import CourseExploration from './CourseExploration'
import ExploreUsers from './ExploreUsers'
import Chat from './Chat'
import CourseDetails from './CourseDetails'

export default function StudentDashboard({ user, onLogout }) {
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCourseExploration, setShowCourseExploration] = useState(false)
  const [showExploreUsers, setShowExploreUsers] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatWithUser, setChatWithUser] = useState(null)
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState(null)

  // Load todos and enrolled courses from database
  useEffect(() => {
    if (user?.id) {
      loadTodos()
      loadEnrolledCourses()
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

  const loadEnrolledCourses = async () => {
    if (!user?.id) return
    
    try {
      setCoursesLoading(true)
      const { enrollments } = await enrollmentService.getStudentCourses(user.id)
      // Filter out courses that are no longer active (draft courses) but include completed courses
      const activeEnrollments = (enrollments || []).filter(enrollment => 
        enrollment.courses?.status === 'active' && 
        (enrollment.status === 'active' || enrollment.status === 'completed')
      )
      setEnrolledCourses(activeEnrollments)
    } catch (error) {
      console.error('Error loading enrolled courses:', error)
    } finally {
      setCoursesLoading(false)
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

  const handleExploreCourses = () => {
    setShowCourseExploration(true)
  }

  const handleExploreUsers = () => {
    setShowExploreUsers(true)
  }

  const handleBackToDashboard = () => {
    setShowCourseExploration(false)
    setShowExploreUsers(false)
    setShowChat(false)
    setChatWithUser(null)
    setSelectedCourseId(null)
    // Reload enrolled courses when coming back from exploration
    loadEnrolledCourses()
  }

  const handleCourseClick = (courseId) => {
    setSelectedCourseId(courseId)
  }

  const handleStartChat = (targetUser) => {
    setChatWithUser(targetUser)
    setShowChat(true)
  }

  // Show course details if requested
  if (selectedCourseId) {
    return <CourseDetails user={user} courseId={selectedCourseId} onBack={handleBackToDashboard} />
  }

  // Show course exploration if requested
  if (showCourseExploration) {
    return <CourseExploration user={user} onBack={handleBackToDashboard} />
  }

  // Show chat if requested
  if (showChat) {
    return <Chat currentUser={user} onBack={handleBackToDashboard} startWithUser={chatWithUser} />
  }

  // Show explore users if requested
  if (showExploreUsers) {
    return <ExploreUsers user={user} onBack={handleBackToDashboard} onStartChat={handleStartChat} />
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <h1>VirtuHack</h1>
            </div>
            <div className="header-right">
              <div className="user-info">
                <span>Welcome, {user?.name || 'User'} (Student)</span>
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

            {/* Action Buttons */}
            <div className="action-buttons">
              <button onClick={handleExploreCourses} className="btn btn-primary btn-large">
                <span className="btn-icon">🔍</span>
                Explore Courses
              </button>
              <button onClick={handleExploreUsers} className="btn btn-outline btn-large">
                <span className="btn-icon">👥</span>
                Explore Users
              </button>
              <button onClick={() => setShowChat(true)} className="btn btn-outline btn-large">
                <span className="btn-icon">💬</span>
                Messages
              </button>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
              {/* Enrolled Courses Section */}
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>Enrolled Courses</h3>
                  <span className="course-count">{enrolledCourses.length} courses</span>
                </div>
                <div className="courses-list">
                  {coursesLoading ? (
                    <p className="loading-state">Loading courses...</p>
                  ) : enrolledCourses.length === 0 ? (
                    <p className="empty-state">No enrolled courses yet. Explore courses to get started!</p>
                  ) : (
                    enrolledCourses.map(enrollment => (
                      <div 
                        key={enrollment.id} 
                        className="course-item"
                        onClick={() => handleCourseClick(enrollment.courses?.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="course-info">
                          <h4>{enrollment.courses?.title || 'Unknown Course'}</h4>
                          <p>Teacher: {enrollment.courses?.users?.name || 'Unknown'}</p>
                          <p>Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}</p>
                        </div>
                        <div className="course-status">
                          <span className={`status-badge ${enrollment.status}`}>
                            {enrollment.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
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
