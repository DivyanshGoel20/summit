import { useEffect, useState } from 'react'
import { courseService, enrollmentService, chapterService, chapterProgressService } from '../lib/database'
import ChapterForm from './ChapterForm'
import CoursePlayer from './CoursePlayer'
import Chat from './Chat'

export default function CourseDetails({ user, courseId, onBack, onCourseCompleted }) {
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
  const [progressByStudent, setProgressByStudent] = useState({})
  const [showChat, setShowChat] = useState(false)
  const [chatWithUser, setChatWithUser] = useState(null)

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
      
      // Load chapters for this course (pass id directly to avoid state timing)
      await loadChapters(courseId)
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

  const loadChapters = async (targetCourseId) => {
    const idToLoad = targetCourseId || course?.id
    if (!idToLoad) return
    try {
      const { chapters: courseChapters } = await chapterService.getCourseChapters(idToLoad)
      setChapters(courseChapters || [])
    } catch (error) {
      console.error('Error loading chapters:', error)
    }
  }

  useEffect(() => {
    if (!course?.id || !chapters || chapters.length === 0) return
    
    const run = async () => {
      try {
        const enrollments = (course?.course_enrollments || []).filter(e => e.users && e.status === 'active')
        
        const results = await Promise.all(enrollments.map(async (e) => {
          // Get the student ID from the enrollment's users field
          const studentId = e.users.id
          if (!studentId) {
            return { studentId: null, completed: 0 }
          }
          
          const { progress } = await chapterProgressService.getStudentChapterProgress(studentId, course.id)
          return { studentId, completed: (progress || []).length }
        }))
        
        const map = {}
        results.forEach(r => { 
          if (r.studentId) {
            map[r.studentId] = { completed: r.completed } 
          }
        })
        setProgressByStudent(map)
      } catch (err) {
        console.error('Error loading student progress:', err)
      }
    }
    run()
  }, [course?.id, chapters])

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

  const handleOpenChat = (student) => {
    setChatWithUser(student)
    setShowChat(true)
  }

  const handleCloseChat = () => {
    setShowChat(false)
    setChatWithUser(null)
  }

  const students = (course?.course_enrollments || [])
    .filter((e) => e.users && e.status === 'active')
    .map((e) => ({
      id: e.users.id,
      name: e.users.name,
      username: e.users.username,
      status: e.status,
      enrolled_at: e.enrolled_at,
    }))
    .filter(s => s.id) // Ensure we only include students with valid IDs

  // Show course player if requested
  if (showCoursePlayer) {
    return <CoursePlayer course={course} user={user} onBack={handleBackFromPlayer} onCourseCompleted={onCourseCompleted} />
  }

  if (showChat) {
    return <Chat currentUser={user} onBack={handleCloseChat} startWithUser={chatWithUser} />
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
                  <button onClick={handleAddChapter} className="btn btn-primary btn-small" style={{ width: 'auto', maxWidth: '200px' }}>
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

                {/* Student Progress Tracker */}
                <div className="card-header" style={{ marginTop: '1rem' }}>
                  <h3>Student Progress</h3>
                  <span className="course-count">{students.length} students</span>
                </div>
                {students.length === 0 ? (
                  <p className="empty-state">No active enrollments yet.</p>
                ) : (
                  <div className="student-progress-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: '1rem',
                    marginTop: '1rem'
                  }}>
                    {students.map((s) => {
                      const completed = progressByStudent[s.id]?.completed || 0
                      const total = chapters.length || 1
                      const pct = Math.round((completed / total) * 100)
                      return (
                        <div key={`progress-${s.id}`} className="student-progress-card" style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '1rem',
                          backgroundColor: '#f9fafb',
                          transition: 'all 0.2s ease'
                        }}>
                          <div className="student-info" style={{ marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                              {s.name}
                            </h4>
                            <p style={{ margin: '0', color: '#6b7280', fontSize: '0.875rem' }}>
                              @{s.username}
                            </p>
                          </div>
                          
                          <div className="progress-info" style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Progress</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                {completed} / {total} chapters
                              </span>
                            </div>
                            <div style={{ 
                              width: '100%', 
                              height: '8px', 
                              backgroundColor: '#e5e7eb', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${isNaN(pct) ? 0 : pct}%`,
                                height: '100%',
                                backgroundColor: pct === 100 ? '#10b981' : pct > 50 ? '#3b82f6' : '#f59e0b',
                                transition: 'width 0.3s ease'
                              }}></div>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                                {isNaN(pct) ? 0 : pct}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="student-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-outline btn-small" 
                              onClick={() => handleOpenChat(s)}
                              style={{ 
                                flex: 1,
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                              }}
                            >
                              💬 Chat
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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


