import { enrollmentService } from '../lib/database'

// Function to check for expired deadlines and remove students
export const checkExpiredDeadlines = async () => {
  try {
    const result = await enrollmentService.checkExpiredDeadlines()
    
    if (result.removedCount > 0) {
      console.log(`Removed ${result.removedCount} students with expired deadlines`)
      console.log('Removed enrollments:', result.removedEnrollments)
      
      // You could add notification logic here
      // For example, send emails to removed students
      return result
    }
    
    return { removedCount: 0, removedEnrollments: [] }
  } catch (error) {
    console.error('Error checking expired deadlines:', error)
    return { removedCount: 0, removedEnrollments: [], error }
  }
}

// Function to check if a specific enrollment is expired
export const isEnrollmentExpired = (enrollment) => {
  if (!enrollment?.completion_deadline) return false
  
  const now = new Date()
  const deadline = new Date(enrollment.completion_deadline)
  
  return now > deadline
}

// Function to get time remaining until deadline
export const getTimeUntilDeadline = (enrollment) => {
  if (!enrollment?.completion_deadline) return null
  
  const now = new Date()
  const deadline = new Date(enrollment.completion_deadline)
  const timeDiff = deadline.getTime() - now.getTime()
  
  if (timeDiff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0 }
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
  
  return { expired: false, days, hours, minutes }
}

// Auto-check deadlines every 5 minutes (for development)
// In production, this should be handled by a cron job or scheduled function
let deadlineCheckInterval = null

export const startDeadlineChecker = (intervalMinutes = 5) => {
  if (deadlineCheckInterval) {
    clearInterval(deadlineCheckInterval)
  }
  
  // Check immediately
  checkExpiredDeadlines()
  
  // Then check every intervalMinutes
  deadlineCheckInterval = setInterval(() => {
    checkExpiredDeadlines()
  }, intervalMinutes * 60 * 1000)
  
  console.log(`Deadline checker started, checking every ${intervalMinutes} minutes`)
}

export const stopDeadlineChecker = () => {
  if (deadlineCheckInterval) {
    clearInterval(deadlineCheckInterval)
    deadlineCheckInterval = null
    console.log('Deadline checker stopped')
  }
}
