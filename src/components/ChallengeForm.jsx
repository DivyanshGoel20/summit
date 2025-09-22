import { useState } from 'react'
import { challengeService } from '../lib/database'

export default function ChallengeForm({ courseId, user, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    question: '',
    options: '',
    correct_answer: '',
    solution_explanation: '',
    difficulty: 'medium'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate form
      if (!formData.title.trim()) {
        throw new Error('Challenge title is required')
      }
      if (!formData.question.trim()) {
        throw new Error('Question is required')
      }
      if (!formData.options.trim()) {
        throw new Error('At least one option is required')
      }
      if (formData.correct_answer === '') {
        throw new Error('Please select the correct answer')
      }

      // Parse options
      const optionsArray = formData.options.split('\n').filter(option => option.trim())
      if (optionsArray.length < 2) {
        throw new Error('At least 2 options are required')
      }

      // Prepare challenge data
      const challengeData = {
        course_id: courseId,
        author_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        question: formData.question.trim(),
        options: JSON.stringify(optionsArray),
        correct_answer: parseInt(formData.correct_answer),
        solution_explanation: formData.solution_explanation.trim() || null,
        difficulty: formData.difficulty
      }

      const { challenge } = await challengeService.createChallenge(challengeData)
      onSave(challenge)
    } catch (error) {
      console.error('Error creating challenge:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Create Student Challenge</h2>
          <button onClick={onCancel} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="course-form">
          <div className="form-group">
            <label htmlFor="title">Challenge Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter challenge title"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter challenge description (optional)"
              className="form-textarea"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="question">Question *</label>
            <input
              type="text"
              id="question"
              name="question"
              value={formData.question}
              onChange={handleChange}
              required
              placeholder="Enter the quiz question..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="options">Answer Options *</label>
            <textarea
              id="options"
              name="options"
              value={formData.options}
              onChange={handleChange}
              placeholder="Enter answer options (one per line)..."
              className="form-textarea"
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="correct_answer">Correct Answer *</label>
            <select
              id="correct_answer"
              name="correct_answer"
              value={formData.correct_answer}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select correct option</option>
              {formData.options.split('\n').filter(o => o.trim()).map((_, idx) => (
                <option key={idx} value={idx}>Option {idx + 1}: {formData.options.split('\n')[idx]?.trim()}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="difficulty">Difficulty Level</label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className="form-select"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="solution_explanation">Solution Explanation (Optional)</label>
            <textarea
              id="solution_explanation"
              name="solution_explanation"
              value={formData.solution_explanation}
              onChange={handleChange}
              placeholder="Provide an explanation for the correct answer (optional)..."
              className="form-textarea"
              rows="3"
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              This explanation will only be shown to students after they attempt the question.
            </small>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Quiz Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
