/**
 * AEGIS Platform Constants
 * Centralized configuration and constants
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  API_KEY: 'test-api-key-123',
  DISCOVERY_API: import.meta.env.VITE_DISCOVERY_API_URL || 'http://localhost:8080',
  GUARDRAILS_API: import.meta.env.VITE_GUARDRAILS_API_URL || 'http://localhost:8081',
  TIMEOUT: 30000 // 30 seconds
} as const

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  AGENTS: {
    LIST: '/v1/agents',
    CREATE: '/v1/agents',
    GET: (id: string) => `/v1/agents/${id}`,
    CLAIM: (id: string) => `/v1/agents/${id}/claim`
  },
  POLICIES: {
    LIST: '/v1/policies',
    CREATE: '/v1/policies',
    GET: (id: string) => `/v1/policies/${id}`,
    UPDATE: (id: string) => `/v1/policies/${id}`
  },
  GUARDRAILS: {
    EVALUATE: '/v1/guardrails/evaluate',
    AUDIT_LOGS: '/v1/guardrails/audit-logs'
  }
} as const

/**
 * Connector Types
 */
export const CONNECTOR_TYPES = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'm365', label: 'Microsoft 365' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'generic', label: 'Generic REST' }
] as const

/**
 * Policy Types
 */
export const POLICY_TYPES = [
  { value: 'pii', label: 'PII Detection' },
  { value: 'content_safety', label: 'Content Safety' },
  { value: 'prompt_injection', label: 'Prompt Injection' },
  { value: 'custom', label: 'Custom Rules' }
] as const

/**
 * Decision Types
 */
export const DECISION_TYPES = {
  ALLOWED: 'ALLOWED',
  DENIED: 'DENIED',
  WARN: 'WARN'
} as const

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  TOAST_DURATION: 3000, // 3 seconds
  COPY_FEEDBACK_DURATION: 2000, // 2 seconds
  MAX_HISTORY_ITEMS: 20,
  DEBOUNCE_DELAY: 300
} as const

/**
 * Validation Rules
 */
export const VALIDATION = {
  AGENT_NAME_MIN_LENGTH: 1,
  AGENT_NAME_MAX_LENGTH: 255,
  POLICY_NAME_MIN_LENGTH: 1,
  POLICY_NAME_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 1000,
  INPUT_TEXT_MAX_LENGTH: 10000
} as const

/**
 * Color Palette
 */
export const COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#8b5cf6',
  SUCCESS: '#10b981',
  DANGER: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#0ea5e9',
  LIGHT: '#f3f4f6',
  DARK: '#1f2937'
} as const

/**
 * Tab Values
 */
export const TABS = {
  DASHBOARD: 'dashboard',
  AGENTS: 'agents',
  POLICIES: 'policies',
  EVALUATE: 'evaluate',
  API: 'api'
} as const

/**
 * Feedback Types
 */
export const FEEDBACK_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info'
} as const

