import { useState, useEffect } from 'react'
import { todoService, courseService } from '../lib/database'

export default function TeacherDashboard({ user, onLogout }) {
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  // Load todos and courses from database
  useEffect(() => {
    loadData()
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      // Load todos
      const { todos: userTodos } = await todoService.getUserTodos(user.id)
      setTodos(userTodos || [])
      
      // Load courses
      const { courses: teacherCourses } = await courseService.getTeacherCourses(user.id)
      setCourses(teacherCourses || [])
    } catch (error) {
      console.error('Error loading data:', error)
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

  const handleCreateCourse = () => {
    // TODO: Implement create course functionality
    alert('Create Course functionality will be implemented soon!')
  }

  const handleViewCourses = () => {
    // TODO: Implement view courses functionality
    alert('View Courses functionality will be implemented soon!')
  }

  const handleCourseClick = (courseId) => {
    // TODO: Implement course detail view
    alert(`Course ${courseId} details will be implemented soon!`)
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1>VirtuHack</h1>
            <div className="user-info">
              <span>Welcome, {user?.name || 'User'} (Teacher)</span>
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
          <div className="teacher-dashboard">
            {/* Welcome Section */}
            <div className="welcome-section">
              <h1>
                Welcome to your <span className="highlight">Teaching Dashboard</span>
              </h1>
              <p>
                This is where your teaching journey begins. Create courses, manage students, and inspire learning.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button onClick={handleCreateCourse} className="btn btn-primary btn-large">
                <span className="btn-icon">➕</span>
                Create New Course
              </button>
              <button onClick={handleViewCourses} className="btn btn-outline btn-large">
                <span className="btn-icon">📚</span>
                Your Courses
              </button>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
              {/* Courses Section */}
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>Your Courses</h3>
                  <span className="course-count">{courses.length} courses</span>
                </div>
                <div className="courses-list">
                  {loading ? (
                    <p className="loading-state">Loading courses...</p>
                  ) : courses.length === 0 ? (
                    <p className="empty-state">No courses yet. Create your first course!</p>
                  ) : (
                    courses.map(course => (
                      <div 
                        key={course.id} 
                        className="course-item"
                        onClick={() => handleCourseClick(course.id)}
                      >
                        <div className="course-info">
                          <h4>{course.title}</h4>
                          <p>{course.course_enrollments?.[0]?.count || 0} students enrolled</p>
                        </div>
                        <div className="course-status">
                          <span className={`status-badge ${course.status}`}>
                            {course.status}
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
                  <h3>To-Do List</h3>
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
