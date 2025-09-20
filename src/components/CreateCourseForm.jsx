import { useState } from 'react'
import { courseService } from '../lib/database'

export default function CreateCourseForm({ user, onCourseCreated, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'draft'
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
        throw new Error('Course title is required')
      }

      // Prepare course data
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        teacher_id: user.id,
        status: formData.status
      }

      // Create course
      const { course } = await courseService.createCourse(courseData)
      
      // Success - notify parent component
      onCourseCreated(course)
    } catch (error) {
      console.error('Error creating course:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Course</h2>
          <button onClick={onCancel} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="course-form">
          <div className="form-group">
            <label htmlFor="title">Course Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter course title"
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
              placeholder="Enter course description (optional)"
              className="form-textarea"
              rows="4"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-select"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
