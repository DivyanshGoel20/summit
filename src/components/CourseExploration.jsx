import { useState, useEffect } from 'react'
import { courseService, enrollmentService } from '../lib/database'

import CourseDetails from './CourseDetails'

export default function CourseExploration({ user, onBack }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrolling, setEnrolling] = useState(null) // Track which course is being enrolled
  const [selectedCourseId, setSelectedCourseId] = useState(null)

  useEffect(() => {
    loadCourses()
  }, [])

  // Check enrollment status for each course
  useEffect(() => {
    if (courses.length > 0 && user?.id) {
      checkEnrollmentStatus()
    }
  }, [courses, user?.id])

  const checkEnrollmentStatus = async () => {
    const updatedCourses = await Promise.all(
      courses.map(async (course) => {
        const { isEnrolled } = await enrollmentService.isEnrolled(user.id, course.id)
        return { ...course, isEnrolled }
      })
    )
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
      
      // Check if already enrolled
      const { isEnrolled } = await enrollmentService.isEnrolled(user.id, courseId)
      if (isEnrolled) {
        alert('You are already enrolled in this course!')
        return
      }

      // Enroll in course
      await enrollmentService.enrollStudent(user.id, courseId)
      
      // Update course list to show enrollment status
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, isEnrolled: true }
          : course
      ))
      
      alert('Successfully enrolled in the course!')
    } catch (error) {
      console.error('Error enrolling in course:', error)
      alert('Failed to enroll in course. Please try again.')
    } finally {
      setEnrolling(null)
    }
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
      />
    )
  }

  return (
    <div className="course-exploration">
      <div className="exploration-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Dashboard
        </button>
        <h1>Explore Courses</h1>
        <p>Discover and enroll in courses that interest you</p>
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
                <span className="course-status active">Active</span>
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
                  disabled={enrolling === course.id || course.isEnrolled}
                  className={`btn ${course.isEnrolled ? 'btn-success' : 'btn-primary'}`}
                >
                  {enrolling === course.id 
                    ? 'Enrolling...' 
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
    </div>
  )
}
