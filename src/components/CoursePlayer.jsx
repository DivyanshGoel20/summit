import { useState, useEffect } from 'react'
import { chapterService, enrollmentService } from '../lib/database'
import { isEnrollmentExpired, getTimeUntilDeadline } from '../utils/deadlineChecker'
import ChallengeList from './ChallengeList'

export default function CoursePlayer({ course, user, onBack, onCourseCompleted }) {
  const [chapters, setChapters] = useState([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [quizResults, setQuizResults] = useState({})
  const [showChallenges, setShowChallenges] = useState(false)
  const [enrollment, setEnrollment] = useState(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (course?.id && user?.id) {
      loadChapters()
      loadEnrollmentData()
    }
  }, [course?.id, user?.id])

  const loadChapters = async () => {
    try {
      setLoading(true)
      const { chapters: courseChapters } = await chapterService.getCourseChapters(course.id)
      setChapters(courseChapters || [])
    } catch (err) {
      setError('Failed to load course content. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadEnrollmentData = async () => {
    try {
      const { enrollment: enrollmentData } = await enrollmentService.isEnrolled(user.id, course.id)
      setEnrollment(enrollmentData)
    } catch (err) {
      console.error('Error loading enrollment data:', err)
    }
  }

  const handleCompleteCourse = async () => {
    if (!user?.id || !course?.id) return

    try {
      setCompleting(true)
      await enrollmentService.completeCourse(user.id, course.id)
      
      // Update local enrollment state
      setEnrollment(prev => ({
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString()
      }))
      
      // Notify parent component about course completion
      if (onCourseCompleted) {
        onCourseCompleted(course.id)
      }
      
      alert('Congratulations! You have successfully completed this course!')
    } catch (err) {
      console.error('Error completing course:', err)
      alert('Failed to complete course. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  const currentChapter = chapters[currentChapterIndex]

  const goToChapter = (index) => {
    setCurrentChapterIndex(index)
  }

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1)
    }
  }

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1)
    }
  }

  const handleQuizSelect = (contentId, optionIndex) => {
    setSelectedAnswers(prev => ({ ...prev, [contentId]: optionIndex }))
    // Clear previous result when changing selection
    setQuizResults(prev => ({ ...prev, [contentId]: undefined }))
  }

  const handleQuizSubmit = (content) => {
    const selected = selectedAnswers[content.id]
    const correctIndex = content.metadata?.correctIndex
    if (typeof selected === 'number' && typeof correctIndex === 'number') {
      const isCorrect = selected === correctIndex
      setQuizResults(prev => ({ ...prev, [content.id]: isCorrect }))
    }
  }

  const handleShowChallenges = () => {
    setShowChallenges(true)
  }

  const handleBackFromChallenges = () => {
    setShowChallenges(false)
  }

  const renderContent = (content) => {
    switch (content.content_type) {
      case 'text':
        return (
          <div className="content-text">
            <div dangerouslySetInnerHTML={{ __html: content.content.replace(/\n/g, '<br>') }} />
          </div>
        )

      case 'image':
        return (
          <div className="content-image">
            <img 
              src={content.metadata?.url || content.content} 
              alt={content.metadata?.alt || 'Course image'}
              style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
            />
          </div>
        )

      case 'video':
        return (
          <div className="content-video">
            <div className="video-container">
              <iframe
                src={content.metadata?.url || content.content}
                title={content.metadata?.title || 'Course video'}
                frameBorder="0"
                allowFullScreen
                style={{ width: '100%', height: '400px', borderRadius: '8px' }}
              />
            </div>
          </div>
        )

      case 'code':
        return (
          <div className="content-code">
            <div className="code-header">
              <span className="code-language">{content.metadata?.language || 'code'}</span>
            </div>
            <pre className="code-block">
              <code>{content.content}</code>
            </pre>
          </div>
        )

      case 'quiz': {
        const options = content.content.split('\n').filter(option => option.trim())
        const selected = selectedAnswers[content.id]
        const result = quizResults[content.id]
        const correctIndex = content.metadata?.correctIndex
        return (
          <div className="content-quiz">
            <div className="quiz-question">
              <h4>{content.metadata?.question || 'Quiz Question'}</h4>
            </div>
            <div className="quiz-options">
              {options.map((option, index) => (
                <label key={index} className="quiz-option" htmlFor={`option_${content.id}_${index}`}>
                  <input 
                    type="radio" 
                    name={`quiz_${content.id}`} 
                    id={`option_${content.id}_${index}`} 
                    checked={selected === index}
                    onChange={() => handleQuizSelect(content.id, index)}
                  />
                  <span>{option.trim()}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className="btn btn-primary btn-small"
                style={{ width: 'auto', maxWidth: '200px' }}
                onClick={() => handleQuizSubmit(content)}
                disabled={typeof selected !== 'number'}
              >
                Check Answer
              </button>
              {typeof result === 'boolean' && (
                <span style={{
                  color: result ? '#16a34a' : '#dc2626',
                  fontWeight: 600
                }}>
                  {result ? 'Correct!' : `Incorrect${typeof correctIndex === 'number' ? ` (Correct: ${options[correctIndex] || ''})` : ''}`}
                </span>
              )}
            </div>
          </div>
        )
      }

      default:
        return <div className="content-unknown">Unknown content type</div>
    }
  }

  // Show challenges if requested
  if (showChallenges) {
    return <ChallengeList courseId={course?.id} user={user} onBack={handleBackFromChallenges} />
  }

  if (loading) {
    return (
      <div className="course-player">
        <div className="course-player-header">
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Course
          </button>
          <h1>{course?.title}</h1>
        </div>
        <div className="course-player-content">
          <div className="loading-container">
            <p className="loading-state">Loading course content...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="course-player">
        <div className="course-player-header">
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Course
          </button>
          <h1>{course?.title}</h1>
        </div>
        <div className="course-player-content">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={loadChapters} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (chapters.length === 0) {
    return (
      <div className="course-player">
        <div className="course-player-header">
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Course
          </button>
          <h1>{course?.title}</h1>
        </div>
        <div className="course-player-content">
          <div className="empty-container">
            <p className="empty-state">No content available yet. Check back later!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="course-player">
      <div className="course-player-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Course
        </button>
        <h1>{course?.title}</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="course-progress">
            Chapter {currentChapterIndex + 1} of {chapters.length}
          </div>
          <button onClick={handleShowChallenges} className="btn btn-outline btn-small" style={{ width: 'auto', maxWidth: '200px' }}>
            🎯 Student Challenges
          </button>
        </div>
      </div>

      <div className="course-player-layout">
        {/* Sidebar - Chapter List */}
        <div className="course-sidebar">
          <h3>Course Content</h3>
          <div className="chapter-list">
            {chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className={`chapter-item ${index === currentChapterIndex ? 'active' : ''}`}
                onClick={() => goToChapter(index)}
              >
                <div className="chapter-number">{index + 1}</div>
                <div className="chapter-info">
                  <h4>{chapter.title}</h4>
                  {chapter.description && (
                    <p>{chapter.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="course-main-content">
          {/* Deadline Warning Banner */}
          {enrollment?.completion_deadline && enrollment.status !== 'completed' && (
            <div className="deadline-banner">
              {(() => {
                const timeInfo = getTimeUntilDeadline(enrollment)
                if (timeInfo.expired) {
                  return (
                    <div className="deadline-expired">
                      <span>⚠️ Your deadline has passed! Complete the course now to avoid being removed.</span>
                    </div>
                  )
                } else if (timeInfo.days <= 1) {
                  return (
                    <div className="deadline-urgent">
                      <span>⏰ Deadline approaching! {timeInfo.days === 0 ? `${timeInfo.hours}h ${timeInfo.minutes}m` : `${timeInfo.days} day${timeInfo.days !== 1 ? 's' : ''}`} remaining</span>
                    </div>
                  )
                } else if (timeInfo.days <= 3) {
                  return (
                    <div className="deadline-warning">
                      <span>⏰ Deadline in {timeInfo.days} days - Complete the course soon!</span>
                    </div>
                  )
                } else {
                  return (
                    <div className="deadline-info">
                      <span>📅 Deadline: {new Date(enrollment.completion_deadline).toLocaleDateString()}</span>
                    </div>
                  )
                }
              })()}
            </div>
          )}

          {currentChapter && (
            <>
              <div className="chapter-header">
                <h2>{currentChapter.title}</h2>
                {currentChapter.description && (
                  <p className="chapter-description">{currentChapter.description}</p>
                )}
              </div>

              <div className="chapter-content">
                {currentChapter.chapter_content && currentChapter.chapter_content.length > 0 ? (
                  currentChapter.chapter_content
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((content, index) => (
                      <div key={content.id || index} className="content-item">
                        {renderContent(content)}
                      </div>
                    ))
                ) : (
                  <div className="empty-content">
                    <p>No content available for this chapter yet.</p>
                  </div>
                )}
              </div>

              {/* Course Completion Section */}
              {currentChapter.title === 'Course Completion' && (
                <div className="course-completion-section">
                  <div className="completion-card">
                    <h3>🎉 Course Completion</h3>
                    <p>You've reached the end of this course! Click the button below to mark this course as completed.</p>
                    
                    {enrollment?.status === 'completed' ? (
                      <div className="completion-success">
                        <p>✅ <strong>Congratulations! You have completed this course!</strong></p>
                        <p>Completed on: {new Date(enrollment.completed_at).toLocaleDateString()}</p>
                      </div>
                    ) : (
                      <div className="completion-actions">
                        {enrollment?.completion_deadline && (
                          <div className="deadline-warning">
                            <p>⏰ <strong>Deadline:</strong> {new Date(enrollment.completion_deadline).toLocaleDateString()}</p>
                            <p>Complete the course before this date to avoid being removed from the course.</p>
                          </div>
                        )}
                        <button
                          onClick={handleCompleteCourse}
                          disabled={completing}
                          className="btn btn-success btn-large"
                        >
                          {completing ? 'Completing...' : 'Complete Course'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="chapter-navigation">
                <button
                  onClick={goToPreviousChapter}
                  disabled={currentChapterIndex === 0}
                  className="btn btn-outline"
                >
                  ← Previous Chapter
                </button>
                {currentChapter.title !== 'Course Completion' && (
                  <button
                    onClick={goToNextChapter}
                    disabled={currentChapterIndex === chapters.length - 1}
                    className="btn btn-primary"
                  >
                    Next Chapter →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
