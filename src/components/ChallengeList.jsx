import { useState, useEffect } from 'react'
import { challengeService, submissionService } from '../lib/database'
import ChallengeForm from './ChallengeForm'

export default function ChallengeList({ courseId, user, onBack }) {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [submissions, setSubmissions] = useState({})

  useEffect(() => {
    if (courseId) {
      loadChallenges()
      loadSubmissions()
    }
  }, [courseId])

  const loadChallenges = async () => {
    try {
      setLoading(true)
      const { challenges: courseChallenges } = await challengeService.getCourseChallenges(courseId)
      setChallenges(courseChallenges || [])
    } catch (error) {
      console.error('Error loading challenges:', error)
      setError('Failed to load challenges')
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async () => {
    if (!user?.id) return
    
    try {
      const { submissions: userSubmissions } = await submissionService.getStudentSubmissions(user.id, courseId)
      const submissionMap = {}
      userSubmissions.forEach(sub => {
        submissionMap[sub.challenge_id] = sub
      })
      setSubmissions(submissionMap)
    } catch (error) {
      console.error('Error loading submissions:', error)
    }
  }

  const handleCreateChallenge = () => {
    setShowCreateForm(true)
  }

  const handleChallengeCreated = (challenge) => {
    setShowCreateForm(false)
    loadChallenges()
  }

  const handleCancelCreate = () => {
    setShowCreateForm(false)
  }

  const handleChallengeClick = (challenge) => {
    console.log('Challenge clicked:', challenge)
    setSelectedChallenge(challenge)
  }

  const handleBackFromChallenge = () => {
    setSelectedChallenge(null)
    loadSubmissions() // Refresh submissions when going back
  }


  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#16a34a'
      case 'medium': return '#d97706'
      case 'hard': return '#dc2626'
      default: return '#6b7280'
    }
  }

  const getSubmissionStatus = (challengeId) => {
    const submission = submissions[challengeId]
    if (!submission) return { status: 'not-attempted', text: 'Not attempted' }
    if (submission.is_correct) return { status: 'correct', text: '✓ Solved', color: '#16a34a' }
    return { status: 'incorrect', text: '✗ Attempted', color: '#dc2626' }
  }

  if (showCreateForm) {
    return (
      <ChallengeForm
        courseId={courseId}
        user={user}
        onSave={handleChallengeCreated}
        onCancel={handleCancelCreate}
      />
    )
  }

  if (selectedChallenge) {
    console.log('Rendering ChallengeDetail with challenge:', selectedChallenge)
    console.log('Submission for this challenge:', submissions[selectedChallenge.id])
    try {
      return (
        <ChallengeDetail
          challenge={selectedChallenge}
          user={user}
          onBack={handleBackFromChallenge}
          submission={submissions[selectedChallenge.id] || null}
        />
      )
    } catch (error) {
      console.error('Error rendering ChallengeDetail:', error)
      return (
        <div className="course-exploration">
          <div className="exploration-header">
            <button onClick={handleBackFromChallenge} className="btn btn-secondary">
              ← Back to Challenges
            </button>
            <h1>Error Loading Challenge</h1>
          </div>
          <div className="dashboard-card">
            <p>There was an error loading this challenge. Please try again.</p>
            <button onClick={handleBackFromChallenge} className="btn btn-primary">
              Go Back
            </button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="course-exploration">
      <div className="exploration-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Course
        </button>
        <h1>Student Challenges</h1>
        <p>Create and solve challenges created by fellow students</p>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>Available Challenges</h3>
          <button onClick={handleCreateChallenge} className="btn btn-primary btn-small" style={{ width: 'auto', maxWidth: '200px' }}>
            + Create Challenge
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <p className="loading-state">Loading challenges...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={loadChallenges} className="btn btn-primary">Try Again</button>
          </div>
        ) : challenges.length === 0 ? (
          <div className="empty-container">
            <p className="empty-state">No challenges yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="courses-list">
            {challenges.map((challenge) => {
              const submissionStatus = getSubmissionStatus(challenge.id)
              return (
                <div
                  key={challenge.id}
                  className="course-item"
                  onClick={() => handleChallengeClick(challenge)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="course-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>❓</span>
                      <h4>{challenge.title}</h4>
                      <span
                        style={{
                          backgroundColor: getDifficultyColor(challenge.difficulty),
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}
                      >
                        {challenge.difficulty}
                      </span>
                    </div>
                    <p>{challenge.description || 'No description provided'}</p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      <span>by @{challenge.users?.username}</span>
                      <span>•</span>
                      <span>{challenge.challenge_submissions?.length || 0} attempts</span>
                    </div>
                  </div>
                  <div className="course-status">
                    <span
                      style={{
                        color: submissionStatus.color || '#6b7280',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}
                    >
                      {submissionStatus.text}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Challenge Detail Component
function ChallengeDetail({ challenge, user, onBack, submission }) {
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#16a34a'
      case 'medium': return '#d97706'
      case 'hard': return '#dc2626'
      default: return '#6b7280'
    }
  }

  useEffect(() => {
    console.log('ChallengeDetail mounted with challenge:', challenge)
    console.log('Challenge options:', challenge?.options)
    console.log('Submission:', submission)
    
    if (submission) {
      setSelectedAnswer(submission.selected_answer.toString())
      setSubmitted(true)
      setResult({
        isCorrect: submission.is_correct
      })
    }
  }, [submission, challenge])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedAnswer === '') return

    try {
      setSubmitting(true)
      
      const selectedIndex = parseInt(selectedAnswer)
      const isCorrect = selectedIndex === challenge.correct_answer

      const submissionData = {
        challenge_id: challenge.id,
        student_id: user.id,
        selected_answer: selectedIndex,
        is_correct: isCorrect
      }

      await submissionService.submitChallenge(submissionData)
      
      setResult({ isCorrect })
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting challenge:', error)
      alert('Failed to submit challenge. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderChallengeContent = () => {
    if (!challenge) {
      return <div>Loading challenge...</div>
    }

    let options = []
    try {
      options = JSON.parse(challenge.options || '[]')
    } catch (error) {
      console.error('Error parsing challenge options:', error)
      options = []
    }
    
    return (
      <div>
        <h4>Question: {challenge.question || 'No question provided'}</h4>
        <div className="quiz-options">
          {options.length === 0 ? (
            <p>No options available for this challenge.</p>
          ) : (
            options.map((option, index) => (
              <label key={index} className="quiz-option">
                <input
                  type="radio"
                  name="quiz_answer"
                  value={index}
                  checked={selectedAnswer === index.toString()}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={submitted}
                />
                <span>{option}</span>
              </label>
            ))
          )}
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="course-exploration">
        <div className="exploration-header">
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Challenges
          </button>
          <h1>Challenge Not Found</h1>
        </div>
        <div className="dashboard-card">
          <p>This challenge could not be loaded. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="course-exploration">
      <div className="exploration-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Challenges
        </button>
        <h1>{challenge.title}</h1>
        <p>by @{challenge.users?.username} • {challenge.difficulty} difficulty</p>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>Quiz Challenge</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            >
              QUIZ
            </span>
            <span
              style={{
                backgroundColor: getDifficultyColor(challenge.difficulty),
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}
            >
              {challenge.difficulty}
            </span>
          </div>
        </div>

        <div className="course-info">
          {challenge.description && (
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              {challenge.description}
            </p>
          )}

          {renderChallengeContent()}

          {result && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              backgroundColor: result.isCorrect ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${result.isCorrect ? '#16a34a' : '#dc2626'}`,
              color: result.isCorrect ? '#166534' : '#991b1b'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'inherit' }}>
                {result.isCorrect ? '✅ Correct!' : '❌ Incorrect'}
              </h4>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                {result.isCorrect ? 'Great job! You got it right.' : `The correct answer was option ${challenge.correct_answer + 1}.`}
              </p>
              {challenge.solution_explanation && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: 'inherit' }}>💡 Solution Explanation:</h5>
                  <p style={{ margin: 0, color: 'inherit' }}>{challenge.solution_explanation}</p>
                </div>
              )}
            </div>
          )}

          {!submitted && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedAnswer === ''}
                className="btn btn-primary"
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
