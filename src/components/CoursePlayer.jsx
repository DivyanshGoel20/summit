import { useState, useEffect } from 'react'
import { chapterService } from '../lib/database'

export default function CoursePlayer({ course, user, onBack }) {
  const [chapters, setChapters] = useState([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (course?.id) {
      loadChapters()
    }
  }, [course?.id])

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

      case 'quiz':
        return (
          <div className="content-quiz">
            <div className="quiz-question">
              <h4>{content.metadata?.question || 'Quiz Question'}</h4>
            </div>
            <div className="quiz-options">
              {content.content.split('\n').filter(option => option.trim()).map((option, index) => (
                <div key={index} className="quiz-option">
                  <input type="radio" name={`quiz_${content.id}`} id={`option_${content.id}_${index}`} />
                  <label htmlFor={`option_${content.id}_${index}`}>{option.trim()}</label>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return <div className="content-unknown">Unknown content type</div>
    }
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
        <div className="course-progress">
          Chapter {currentChapterIndex + 1} of {chapters.length}
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

              <div className="chapter-navigation">
                <button
                  onClick={goToPreviousChapter}
                  disabled={currentChapterIndex === 0}
                  className="btn btn-outline"
                >
                  ← Previous Chapter
                </button>
                <button
                  onClick={goToNextChapter}
                  disabled={currentChapterIndex === chapters.length - 1}
                  className="btn btn-primary"
                >
                  Next Chapter →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
