import { supabase } from './supabase'

// Course operations
export const courseService = {
  // Create a new course
  async createCourse(courseData) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([courseData])
        .select()
        .single()

      if (error) throw error
      return { course: data }
    } catch (error) {
      throw error
    }
  },

  // Get all courses for a teacher
  async getTeacherCourses(teacherId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_enrollments(count)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { courses: data }
    } catch (error) {
      throw error
    }
  },

  // Get all active courses (for students to browse)
  async getActiveCourses() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          users!courses_teacher_id_fkey(name, username)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { courses: data }
    } catch (error) {
      throw error
    }
  },

  // Get course details
  async getCourseDetails(courseId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          users!courses_teacher_id_fkey(name, username),
          course_enrollments(
            id,
            status,
            enrolled_at,
            users!course_enrollments_student_id_fkey(name, username)
          )
        `)
        .eq('id', courseId)
        .single()

      if (error) throw error
      return { course: data }
    } catch (error) {
      throw error
    }
  },

  // Update course
  async updateCourse(courseId, updates) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select()
        .single()

      if (error) throw error
      return { course: data }
    } catch (error) {
      throw error
    }
  },

  // Delete course
  async deleteCourse(courseId) {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      throw error
    }
  }
}

// Course enrollment operations
export const enrollmentService = {
  // Enroll student in course
  async enrollStudent(studentId, courseId) {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert([{
          student_id: studentId,
          course_id: courseId
        }])
        .select()
        .single()

      if (error) throw error
      return { enrollment: data }
    } catch (error) {
      throw error
    }
  },

  // Get student's enrolled courses
  async getStudentCourses(studentId) {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses!course_enrollments_course_id_fkey(
            id,
            title,
            description,
            status,
            created_at,
            users!courses_teacher_id_fkey(name, username)
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false })

      if (error) throw error
      return { enrollments: data }
    } catch (error) {
      throw error
    }
  },

  // Drop course enrollment
  async dropCourse(studentId, courseId) {
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .update({ status: 'dropped' })
        .eq('student_id', studentId)
        .eq('course_id', courseId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      throw error
    }
  },

  // Check if student is enrolled
  async isEnrolled(studentId, courseId) {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return { isEnrolled: !!data }
    } catch (error) {
      throw error
    }
  }
}

// Todo operations
export const todoService = {
  // Create a new todo
  async createTodo(todoData) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([todoData])
        .select()
        .single()

      if (error) throw error
      return { todo: data }
    } catch (error) {
      throw error
    }
  },

  // Get all todos for a user
  async getUserTodos(userId) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { todos: data }
    } catch (error) {
      throw error
    }
  },

  // Update todo
  async updateTodo(todoId, updates) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', todoId)
        .select()
        .single()

      if (error) throw error
      return { todo: data }
    } catch (error) {
      throw error
    }
  },

  // Delete todo
  async deleteTodo(todoId) {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      throw error
    }
  },

  // Toggle todo completion
  async toggleTodo(todoId) {
    try {
      // First get the current todo
      const { data: currentTodo, error: fetchError } = await supabase
        .from('todos')
        .select('completed')
        .eq('id', todoId)
        .single()

      if (fetchError) throw fetchError

      // Update with opposite completion status
      const { data, error } = await supabase
        .from('todos')
        .update({ completed: !currentTodo.completed })
        .eq('id', todoId)
        .select()
        .single()

      if (error) throw error
      return { todo: data }
    } catch (error) {
      throw error
    }
  }
}

// Messaging operations
export const messagingService = {
  // Get or create conversation between two users
  async getOrCreateConversation(user1Id, user2Id) {
    try {
      // First try to find existing conversation
      const { data: existingConversation, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant1_id.eq.${user1Id},participant2_id.eq.${user2Id}),and(participant1_id.eq.${user2Id},participant2_id.eq.${user1Id})`)
        .single()

      if (existingConversation) {
        return { conversation: existingConversation }
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([{
          participant1_id: user1Id,
          participant2_id: user2Id
        }])
        .select()
        .single()

      if (createError) throw createError
      return { conversation: newConversation }
    } catch (error) {
      throw error
    }
  },

  // Get all conversations for a user
  async getUserConversations(userId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:users!conversations_participant1_id_fkey(id, name, username, role),
          participant2:users!conversations_participant2_id_fkey(id, name, username, role),
          messages(id, content, sender_id, created_at, is_read)
        `)
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return { conversations: data }
    } catch (error) {
      throw error
    }
  },

  // Get messages for a conversation
  async getConversationMessages(conversationId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, name, username, role)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return { messages: data }
    } catch (error) {
      throw error
    }
  },

  // Send a message
  async sendMessage(conversationId, senderId, content, messageType = 'text') {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: senderId,
          content: content,
          message_type: messageType
        }])
        .select()
        .single()

      if (error) throw error

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      return { message: data }
    } catch (error) {
      throw error
    }
  },

  // Mark messages as read
  async markMessagesAsRead(conversationId, userId) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      throw error
    }
  },

  // Get unread message count for a user
  async getUnreadCount(userId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversations!inner(participant1_id, participant2_id)
        `)
        .eq('is_read', false)
        .neq('sender_id', userId)
        .or(`conversations.participant1_id.eq.${userId},conversations.participant2_id.eq.${userId}`)

      if (error) throw error
      return { unreadCount: data?.length || 0 }
    } catch (error) {
      throw error
    }
  }
}
