import { useEffect, useState } from 'react'
import { courseService, enrollmentService, chapterService } from '../lib/database'
import ChapterForm from './ChapterForm'
import CoursePlayer from './CoursePlayer'

export default function CourseDetails({ user, courseId, onBack }) {
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showChapterForm, setShowChapterForm] = useState(false)
  const [editingChapter, setEditingChapter] = useState(null)
  const [showCoursePlayer, setShowCoursePlayer] = useState(false)
  const [chapters, setChapters] = useState([])

  useEffect(() => {
    if (courseId) {
      loadCourse()
    }
  }, [courseId])

  const loadCourse = async () => {
    try {
      setLoading(true)
      setError('')
      const { course: data } = await courseService.getCourseDetails(courseId)
      setCourse(data)
      
      // Check if current user is enrolled (only for students)
      if (user?.role === 'student' && user?.id) {
        const { isEnrolled: enrolled } = await enrollmentService.isEnrolled(user.id, courseId)
        setIsEnrolled(enrolled)
      } else if (user?.role === 'teacher') {
        // Teachers are always "enrolled" in their own courses
        setIsEnrolled(true)
      }
      
      // Load chapters for this course
      await loadChapters()
    } catch (err) {
      setError('Failed to load course details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!user?.id || user?.role !== 'student') return

    try {
      setEnrolling(true)
      
      // Check if already enrolled
      const { isEnrolled: alreadyEnrolled } = await enrollmentService.isEnrolled(user.id, courseId)
      if (alreadyEnrolled) {
        alert('You are already enrolled in this course!')
        return
      }

      // Enroll in course
      await enrollmentService.enrollStudent(user.id, courseId)
      setIsEnrolled(true)
      alert('Successfully enrolled in the course!')
    } catch (error) {
      console.error('Error enrolling in course:', error)
      alert('Failed to enroll in course. Please try again.')
    } finally {
      setEnrolling(false)
    }
  }

  const handleStatusToggle = async () => {
    if (!user?.id || user?.role !== 'teacher' || !course) return

    try {
      setUpdatingStatus(true)
      const newStatus = course.status === 'active' ? 'draft' : 'active'
      
      const { course: updatedCourse } = await courseService.updateCourse(courseId, {
        status: newStatus
      })
      
      // If changing to draft, completely remove all enrolled students
      if (newStatus === 'draft') {
        const { supabase } = await import('../lib/supabase')
        const { error } = await supabase
          .from('course_enrollments')
          .delete()
          .eq('course_id', courseId)
        
        if (error) {
          console.error('Error removing students from course:', error)
          alert('Course status updated, but failed to remove enrolled students. Please try again.')
          return
        }
      }
      
      setCourse(updatedCourse)
      
      // Reload course details to get updated enrollment list
      await loadCourse()
      
      alert(`Course status updated to ${newStatus}!${newStatus === 'draft' ? ' All enrolled students have been removed.' : ''}`)
    } catch (error) {
      console.error('Error updating course status:', error)
      alert('Failed to update course status. Please try again.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const loadChapters = async () => {
    if (!course?.id) return
    
    try {
      const { chapters: courseChapters } = await chapterService.getCourseChapters(course.id)
      setChapters(courseChapters || [])
    } catch (error) {
      console.error('Error loading chapters:', error)
    }
  }

  const handleAddChapter = () => {
    setEditingChapter(null)
    setShowChapterForm(true)
  }

  const handleEditChapter = (chapter) => {
    setEditingChapter(chapter)
    setShowChapterForm(true)
  }

  const handleChapterSaved = (savedChapter) => {
    setShowChapterForm(false)
    setEditingChapter(null)
    loadChapters()
  }

  const handleCancelChapterForm = () => {
    setShowChapterForm(false)
    setEditingChapter(null)
  }

  const handleStartCourse = () => {
    setShowCoursePlayer(true)
  }

  const handleBackFromPlayer = () => {
    setShowCoursePlayer(false)
  }

  const students = (course?.course_enrollments || [])
    .filter((e) => e.users && e.status === 'active')
    .map((e) => ({
      id: e.users?.id,
      name: e.users?.name,
      username: e.users?.username,
      status: e.status,
      enrolled_at: e.enrolled_at,
    }))

  // Show course player if requested
  if (showCoursePlayer) {
    return <CoursePlayer course={course} user={user} onBack={handleBackFromPlayer} />
  }

  return (
    <div className="course-exploration">
      <div className="exploration-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back
        </button>
        <h1>Course Details</h1>
        <p>View course information and enrollment</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <p className="loading-state">Loading course...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={loadCourse} className="btn btn-primary">Try Again</button>
        </div>
      ) : !course ? (
        <div className="empty-container">
          <p className="empty-state">Course not found.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* Left: Course overview */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>{course.title}</h3>
              <span className={`status-badge ${course.status}`}>{course.status}</span>
            </div>
            <div className="course-info">
              <p className="course-description">{course.description || 'No description provided.'}</p>
              <div className="course-meta">
                <div className="meta-item">
                  <span className="meta-label">Created by:</span>
                  <span className="meta-value">{course.users?.name} @{course.users?.username}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Created on:</span>
                  <span className="meta-value">{new Date(course.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="course-actions" style={{ marginTop: '1rem' }}>
                {user?.role === 'student' ? (
                  isEnrolled ? (
                    <button onClick={handleStartCourse} className="btn btn-primary">Start Course</button>
                  ) : (
                    <button 
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="btn btn-primary"
                    >
                      {enrolling ? 'Enrolling...' : 'Enroll in Course'}
                    </button>
                  )
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary">Edit Course</button>
                    <button 
                      onClick={handleStatusToggle}
                      disabled={updatingStatus}
                      className="btn btn-outline"
                    >
                      {updatingStatus ? 'Updating...' : `Set to ${course?.status === 'active' ? 'Draft' : 'Active'}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Enrollment or Course Content */}
          <div className="dashboard-card">
            {user?.role === 'teacher' ? (
              <>
                <div className="card-header">
                  <h3>Course Content</h3>
                  <button onClick={handleAddChapter} className="btn btn-primary btn-small">
                    + Add Chapter
                  </button>
                </div>
                <div className="courses-list">
                  {chapters.length === 0 ? (
                    <p className="empty-state">No chapters yet. Add your first chapter!</p>
                  ) : (
                    chapters.map((chapter, index) => (
                      <div key={chapter.id} className="course-item" style={{ cursor: 'default' }}>
                        <div className="course-info">
                          <h4>Chapter {index + 1}: {chapter.title}</h4>
                          <p>{chapter.description || 'No description'}</p>
                          <p>{chapter.chapter_content?.length || 0} content blocks</p>
                        </div>
                        <div className="course-status">
                          <button 
                            onClick={() => handleEditChapter(chapter)}
                            className="btn btn-outline btn-small"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="card-header">
                  <h3>Enrolled Students</h3>
                  <span className="course-count">{students.length} students</span>
                </div>
                <div className="courses-list">
                  {students.length === 0 ? (
                    <p className="empty-state">No students enrolled yet.</p>
                  ) : (
                    students.map((s) => (
                      <div key={`${s.username}-${s.enrolled_at}`} className="course-item" style={{ cursor: 'default' }}>
                        <div className="course-info">
                          <h4>{s.name}</h4>
                          <p>@{s.username} • Enrolled {new Date(s.enrolled_at).toLocaleDateString()}</p>
                        </div>
                        <div className="course-status">
                          <span className={`status-badge ${s.status}`}>{s.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chapter Form Modal */}
      {showChapterForm && (
        <ChapterForm
          courseId={courseId}
          chapter={editingChapter}
          onSave={handleChapterSaved}
          onCancel={handleCancelChapterForm}
        />
      )}
    </div>
  )
}


