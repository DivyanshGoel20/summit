import { useState, useEffect } from 'react'
import { courseService, enrollmentService } from '../lib/database'

import CourseDetails from './CourseDetails'

export default function CourseExploration({ user, onBack }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrolling, setEnrolling] = useState(null) // Track which course is being enrolled
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [showDeadlineModal, setShowDeadlineModal] = useState(false)
  const [selectedCourseForDeadline, setSelectedCourseForDeadline] = useState(null)
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('')

  useEffect(() => {
    loadCourses()
  }, [])

  // Refresh enrollment status when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && courses.length > 0 && user?.id) {
        checkEnrollmentStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [courses.length, user?.id])

  // Check enrollment status for each course
  useEffect(() => {
    if (courses.length > 0 && user?.id) {
      checkEnrollmentStatus()
    }
  }, [courses.length, user?.id]) // Only depend on length, not the entire courses array

  const checkEnrollmentStatus = async () => {
    console.log('Checking enrollment status for courses:', courses.length)
    const updatedCourses = await Promise.all(
      courses.map(async (course) => {
        const { isEnrolled, enrollment } = await enrollmentService.isEnrolled(user.id, course.id)
        console.log(`Course ${course.title}:`, { isEnrolled, enrollment })
        return { 
          ...course, 
          isEnrolled: isEnrolled && enrollment?.status !== 'completed',
          enrollmentStatus: enrollment?.status || null,
          completionDeadline: enrollment?.completion_deadline || null,
          completedAt: enrollment?.completed_at || null
        }
      })
    )
    console.log('Updated courses:', updatedCourses)
    setCourses(updatedCourses)
  }

  const loadCourses = async () => {
    try {
      setLoading(true)
      const { courses: activeCourses } = await courseService.getActiveCourses()
      setCourses(activeCourses || [])
    } catch (error) {
      console.error('Error loading courses:', error)
      setError('Failed to load courses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId) => {
    if (!user?.id) return

    try {
      setEnrolling(courseId)
      
      // Check if already enrolled or completed
      const { isEnrolled, enrollment } = await enrollmentService.isEnrolled(user.id, courseId)
      if (isEnrolled) {
        alert('You are already enrolled in this course!')
        return
      }
      if (enrollment?.status === 'completed') {
        alert('You have already completed this course!')
        return
      }

      // Show deadline modal
      setSelectedCourseForDeadline(courseId)
      setShowDeadlineModal(true)
    } catch (error) {
      console.error('Error checking enrollment:', error)
      alert('Failed to check enrollment status. Please try again.')
    } finally {
      setEnrolling(null)
    }
  }

  const handleDeadlineSubmit = async () => {
    if (!selectedCourseForDeadline || !user?.id) return

    try {
      setEnrolling(selectedCourseForDeadline)
      
      let completionDeadline = null
      if (deadlineDate && deadlineTime) {
        const deadlineDateTime = new Date(`${deadlineDate}T${deadlineTime}`)
        completionDeadline = deadlineDateTime.toISOString()
      }

      // Enroll in course with optional deadline
      await enrollmentService.enrollStudent(user.id, selectedCourseForDeadline, completionDeadline)
      
      // Update course list to show enrollment status
      setCourses(courses.map(course => 
        course.id === selectedCourseForDeadline 
          ? { ...course, isEnrolled: true }
          : course
      ))
      
      const deadlineText = completionDeadline 
        ? ` with deadline: ${new Date(completionDeadline).toLocaleDateString()}`
        : ''
      alert(`Successfully enrolled in the course${deadlineText}!`)
      
      // Reset modal state
      setShowDeadlineModal(false)
      setSelectedCourseForDeadline(null)
      setDeadlineDate('')
      setDeadlineTime('')
    } catch (error) {
      console.error('Error enrolling in course:', error)
      alert('Failed to enroll in course. Please try again.')
    } finally {
      setEnrolling(null)
    }
  }

  const handleDeadlineCancel = () => {
    setShowDeadlineModal(false)
    setSelectedCourseForDeadline(null)
    setDeadlineDate('')
    setDeadlineTime('')
  }

  const getEnrollmentStatus = async (courseId) => {
    if (!user?.id) return false
    try {
      const { isEnrolled } = await enrollmentService.isEnrolled(user.id, courseId)
      return isEnrolled
    } catch (error) {
      return false
    }
  }

  if (selectedCourseId) {
    return (
      <CourseDetails
        user={user}
        courseId={selectedCourseId}
        onBack={() => setSelectedCourseId(null)}
        onCourseCompleted={(courseId) => {
          // Refresh enrollment status when course is completed
          checkEnrollmentStatus()
        }}
      />
    )
  }

  return (
    <div className="course-exploration">
      <div className="exploration-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>Explore Courses</h1>
          <p>Discover and enroll in courses that interest you</p>
        </div>
        <button 
          onClick={() => {
            loadCourses()
            if (user?.id) {
              checkEnrollmentStatus()
            }
          }} 
          className="btn btn-outline"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <p className="loading-state">Loading courses...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={loadCourses} className="btn btn-primary">
            Try Again
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-container">
          <p className="empty-state">No active courses available at the moment.</p>
          <p>Check back later for new courses!</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <div key={course.id} className="course-card">
              <div className="course-header">
                <h3>{course.title}</h3>
                <div className="course-status-container">
                  <span className="course-status active">Active</span>
                  {course.enrollmentStatus === 'completed' && (
                    <span className="course-status completed">Completed ✓</span>
                  )}
                </div>
              </div>
              
              <div className="course-info">
                <p className="course-description">
                  {course.description || 'No description available.'}
                </p>
                
                <div className="course-meta">
                  <div className="meta-item">
                    <span className="meta-label">Teacher:</span>
                    <span className="meta-value">{course.users?.name || 'Unknown'}</span>
                  </div>
                  
                  <div className="meta-item">
                    <span className="meta-label">Created:</span>
                    <span className="meta-value">
                      {new Date(course.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {course.enrollmentStatus === 'completed' && course.completedAt && (
                    <div className="meta-item">
                      <span className="meta-label">Completed:</span>
                      <span className="meta-value completed-date">
                        {new Date(course.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="course-actions">
                <button
                  onClick={() => setSelectedCourseId(course.id)}
                  className="btn btn-outline"
                  style={{ marginRight: '0.5rem' }}
                >
                  View Details
                </button>
                <button
                  onClick={() => handleEnroll(course.id)}
                  disabled={enrolling === course.id || course.isEnrolled || course.enrollmentStatus === 'completed'}
                  className={`btn ${
                    course.enrollmentStatus === 'completed' 
                      ? 'btn-completed' 
                      : course.isEnrolled 
                        ? 'btn-success' 
                        : 'btn-primary'
                  }`}
                >
                  {enrolling === course.id 
                    ? 'Enrolling...' 
                    : course.enrollmentStatus === 'completed'
                      ? 'Completed ✓'
                      : course.isEnrolled 
                        ? 'Enrolled ✓' 
                        : 'Enroll Now'
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deadline Setting Modal */}
      {showDeadlineModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Set Course Completion Deadline (Optional)</h2>
              <p>You can set a deadline to complete this course. If you don't complete it by the deadline, you'll be automatically removed from the course.</p>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="deadline-date">Deadline Date (Optional)</label>
                <input
                  type="date"
                  id="deadline-date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deadline-time">Deadline Time (Optional)</label>
                <input
                  type="time"
                  id="deadline-time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="deadline-info">
                <p><strong>Note:</strong> If you don't set a deadline, you can complete the course at your own pace.</p>
                <p>If you set a deadline and don't complete the course by then, you'll be automatically removed and will need to re-enroll.</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={handleDeadlineCancel} 
                className="btn btn-secondary"
                disabled={enrolling}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeadlineSubmit} 
                className="btn btn-primary"
                disabled={enrolling}
              >
                {enrolling ? 'Enrolling...' : 'Enroll in Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
