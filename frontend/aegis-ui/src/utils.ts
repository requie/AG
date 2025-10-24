/**
 * AEGIS Platform Utility Functions
 * Helper functions for common operations and type guards
 */

import { Agent, Policy, EvaluateResponse, AuditLog } from './types'

/**
 * Format a date string to a readable format
 * @param dateString - ISO 8601 date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Copy text to clipboard and provide visual feedback
 * @param text - Text to copy
 * @param setCopied - State setter for copy feedback
 */
export const copyToClipboard = (text: string, setCopied: (value: boolean) => void): void => {
  navigator.clipboard.writeText(text)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}

/**
 * Generate a UUID v4
 * @returns UUID string
 */
export const generateUUID = (): string => {
  return crypto.randomUUID()
}

/**
 * Type guard to check if a value is an Agent
 * @param value - Value to check
 * @returns True if value is an Agent
 */
export const isAgent = (value: unknown): value is Agent => {
  const obj = value as Record<string, unknown>
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.owner_email === 'string' &&
    typeof obj.connector_type === 'string' &&
    typeof obj.created_at === 'string'
  )
}

/**
 * Type guard to check if a value is a Policy
 * @param value - Value to check
 * @returns True if value is a Policy
 */
export const isPolicy = (value: unknown): value is Policy => {
  const obj = value as Record<string, unknown>
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.customer_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.policy_type === 'string' &&
    typeof obj.enabled === 'boolean' &&
    typeof obj.created_at === 'string'
  )
}

/**
 * Type guard to check if a value is an EvaluateResponse
 * @param value - Value to check
 * @returns True if value is an EvaluateResponse
 */
export const isEvaluateResponse = (value: unknown): value is EvaluateResponse => {
  const obj = value as Record<string, unknown>
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj.decision === 'ALLOWED' || obj.decision === 'DENIED' || obj.decision === 'WARN') &&
    typeof obj.reason === 'string' &&
    Array.isArray(obj.checks_run) &&
    obj.checks_run.every((item: unknown) => typeof item === 'string')
  )
}

/**
 * Validate an email address
 * @param email - Email to validate
 * @returns True if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Truncate a string to a maximum length
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated string
 */
export const truncate = (str: string, maxLength: number, suffix: string = '...'): string => {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Get the color class for a decision badge
 * @param decision - Decision value
 * @returns Tailwind CSS class string
 */
export const getDecisionColorClass = (decision: 'ALLOWED' | 'DENIED' | 'WARN'): string => {
  const colorMap: Record<string, string> = {
    ALLOWED: 'bg-green-100 text-green-800 border-green-300',
    DENIED: 'bg-red-100 text-red-800 border-red-300',
    WARN: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }
  return colorMap[decision] || colorMap.ALLOWED
}

/**
 * Calculate statistics from evaluation history
 * @param evaluations - Array of evaluation results
 * @returns Statistics object
 */
export const calculateEvaluationStats = (evaluations: Array<{ decision: 'ALLOWED' | 'DENIED' | 'WARN' }>) => {
  const total = evaluations.length
  const denied = evaluations.filter(e => e.decision === 'DENIED').length
  const warned = evaluations.filter(e => e.decision === 'WARN').length
  const allowed = evaluations.filter(e => e.decision === 'ALLOWED').length

  return {
    total,
    denied,
    warned,
    allowed,
    denyRate: total > 0 ? Math.round((denied / total) * 100) : 0,
    warnRate: total > 0 ? Math.round((warned / total) * 100) : 0,
    allowRate: total > 0 ? Math.round((allowed / total) * 100) : 0
  }
}

/**
 * Format API endpoint URL
 * @param baseUrl - Base API URL
 * @param endpoint - Endpoint path
 * @returns Full endpoint URL
 */
export const formatEndpointUrl = (baseUrl: string, endpoint: string): string => {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${base}${path}`
}

/**
 * Handle API errors and return user-friendly messages
 * @param error - Error object
 * @returns User-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}

