import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

// Simple session storage
let currentUser = null

export const auth = {
  // Sign up a new user
  async signUp(name, username, password, role) {
    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        throw new Error('Username already exists')
      }

      // Hash the password
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            name: name,
            username: username,
            role: role,
            password_hash: passwordHash
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Set current user
      currentUser = { id: data.id, name: data.name, username: data.username, role: data.role }
      localStorage.setItem('currentUser', JSON.stringify(currentUser))

      return { user: currentUser }
    } catch (error) {
      throw error
    }
  },

  // Sign in an existing user
  async signIn(username, password) {
    try {
      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

      if (error || !user) {
        throw new Error('User not found')
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        throw new Error('Invalid password')
      }

      // Set current user
      currentUser = { id: user.id, name: user.name, username: user.username, role: user.role }
      localStorage.setItem('currentUser', JSON.stringify(currentUser))

      return { user: currentUser }
    } catch (error) {
      throw error
    }
  },

  // Sign out current user
  signOut() {
    currentUser = null
    localStorage.removeItem('currentUser')
  },

  // Get current user
  getCurrentUser() {
    if (currentUser) return currentUser
    
    // Try to get from localStorage
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      currentUser = JSON.parse(stored)
      return currentUser
    }
    
    return null
  },

  // Check if user is authenticated
  isAuthenticated() {
    return this.getCurrentUser() !== null
  }
}
