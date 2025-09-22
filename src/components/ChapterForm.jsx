import { useState, useEffect } from 'react'
import { chapterService, contentService } from '../lib/database'

export default function ChapterForm({ courseId, chapter, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order_index: 0
  })
  const [contentBlocks, setContentBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (chapter) {
      setFormData({
        title: chapter.title || '',
        description: chapter.description || '',
        order_index: chapter.order_index || 0
      })
      setContentBlocks(chapter.chapter_content || [])
    }
  }, [chapter])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const addContentBlock = (type) => {
    const newBlock = {
      id: `temp_${Date.now()}`,
      content_type: type,
      content: '',
      metadata: {},
      order_index: contentBlocks.length
    }
    setContentBlocks([...contentBlocks, newBlock])
  }

  const updateContentBlock = (index, updates) => {
    const updated = [...contentBlocks]
    updated[index] = { ...updated[index], ...updates }
    setContentBlocks(updated)
  }

  const removeContentBlock = (index) => {
    const updated = contentBlocks.filter((_, i) => i !== index)
    setContentBlocks(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate form
      if (!formData.title.trim()) {
        throw new Error('Chapter title is required')
      }

      let savedChapter
      if (chapter) {
        // Update existing chapter
        const { chapter: updatedChapter } = await chapterService.updateChapter(chapter.id, formData)
        savedChapter = updatedChapter
      } else {
        // Create new chapter
        const { chapter: newChapter } = await chapterService.createChapter({
          ...formData,
          course_id: courseId
        })
        savedChapter = newChapter
      }

      // Save content blocks
      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i]
        if (block.id.toString().startsWith('temp_')) {
          // New content block
          await contentService.addContent({
            chapter_id: savedChapter.id,
            content_type: block.content_type,
            content: block.content,
            metadata: block.metadata,
            order_index: i
          })
        } else {
          // Update existing content block
          await contentService.updateContent(block.id, {
            content_type: block.content_type,
            content: block.content,
            metadata: block.metadata,
            order_index: i
          })
        }
      }

      onSave(savedChapter)
    } catch (error) {
      console.error('Error saving chapter:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const renderContentBlock = (block, index) => {
    const updateBlock = (updates) => updateContentBlock(index, updates)

    return (
      <div key={block.id} className="content-block">
        <div className="content-block-header">
          <select
            value={block.content_type}
            onChange={(e) => updateBlock({ content_type: e.target.value })}
            className="form-select"
            style={{ width: '150px' }}
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="code">Code</option>
            <option value="quiz">Quiz</option>
          </select>
          <button
            type="button"
            onClick={() => removeContentBlock(index)}
            className="btn btn-secondary btn-small"
          >
            Remove
          </button>
        </div>

        {block.content_type === 'text' && (
          <textarea
            value={block.content}
            onChange={(e) => updateBlock({ content: e.target.value })}
            placeholder="Enter text content..."
            className="form-textarea"
            rows="6"
          />
        )}

        {block.content_type === 'image' && (
          <div>
            <input
              type="url"
              value={block.metadata?.url || ''}
              onChange={(e) => updateBlock({ 
                metadata: { ...block.metadata, url: e.target.value },
                content: e.target.value
              })}
              placeholder="Image URL..."
              className="form-input"
            />
            <input
              type="text"
              value={block.metadata?.alt || ''}
              onChange={(e) => updateBlock({ 
                metadata: { ...block.metadata, alt: e.target.value }
              })}
              placeholder="Alt text..."
              className="form-input"
              style={{ marginTop: '0.5rem' }}
            />
          </div>
        )}

        {block.content_type === 'video' && (
          <div>
            <input
              type="url"
              value={block.metadata?.url || ''}
              onChange={(e) => updateBlock({ 
                metadata: { ...block.metadata, url: e.target.value },
                content: e.target.value
              })}
              placeholder="Video URL (YouTube, Vimeo, etc.)..."
              className="form-input"
            />
            <input
              type="text"
              value={block.metadata?.title || ''}
              onChange={(e) => updateBlock({ 
                metadata: { ...block.metadata, title: e.target.value }
              })}
              placeholder="Video title..."
              className="form-input"
              style={{ marginTop: '0.5rem' }}
            />
          </div>
        )}

        {block.content_type === 'code' && (
          <div>
            <select
              value={block.metadata?.language || 'javascript'}
              onChange={(e) => updateBlock({ 
                metadata: { ...block.metadata, language: e.target.value }
              })}
              className="form-select"
              style={{ width: '150px', marginBottom: '0.5rem' }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="sql">SQL</option>
            </select>
            <textarea
              value={block.content}
              onChange={(e) => updateBlock({ content: e.target.value })}
              placeholder="Enter code..."
              className="form-textarea"
              rows="8"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
        )}

        {block.content_type === 'quiz' && (
          <div>
            <input
              type="text"
              value={block.metadata?.question || ''}
              onChange={(e) => updateBlock({ 
                metadata: { ...block.metadata, question: e.target.value }
              })}
              placeholder="Quiz question..."
              className="form-input"
            />
            <textarea
              value={block.content}
              onChange={(e) => updateBlock({ content: e.target.value })}
              placeholder="Quiz options (one per line)..."
              className="form-textarea"
              rows="4"
              style={{ marginTop: '0.5rem' }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>{chapter ? 'Edit Chapter' : 'Add New Chapter'}</h2>
          <button onClick={onCancel} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="course-form">
          <div className="form-group">
            <label htmlFor="title">Chapter Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter chapter title"
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
              placeholder="Enter chapter description (optional)"
              className="form-textarea"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="order_index">Chapter Order</label>
            <input
              type="number"
              id="order_index"
              name="order_index"
              value={formData.order_index}
              onChange={handleChange}
              min="0"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Chapter Content</label>
            <div className="content-blocks">
              {contentBlocks.map((block, index) => renderContentBlock(block, index))}
              
              <div className="add-content-buttons">
                <button
                  type="button"
                  onClick={() => addContentBlock('text')}
                  className="btn btn-outline btn-small"
                >
                  + Add Text
                </button>
                <button
                  type="button"
                  onClick={() => addContentBlock('image')}
                  className="btn btn-outline btn-small"
                >
                  + Add Image
                </button>
                <button
                  type="button"
                  onClick={() => addContentBlock('video')}
                  className="btn btn-outline btn-small"
                >
                  + Add Video
                </button>
                <button
                  type="button"
                  onClick={() => addContentBlock('code')}
                  className="btn btn-outline btn-small"
                >
                  + Add Code
                </button>
                <button
                  type="button"
                  onClick={() => addContentBlock('quiz')}
                  className="btn btn-outline btn-small"
                >
                  + Add Quiz
                </button>
              </div>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (chapter ? 'Update Chapter' : 'Create Chapter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
