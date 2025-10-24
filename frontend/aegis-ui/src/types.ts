/**
 * AEGIS Platform Type Definitions
 * Comprehensive TypeScript interfaces for all data models
 */

/**
 * Represents an AI Agent in the AEGIS platform
 */
export interface Agent {
  id: string
  name: string
  owner_email: string
  connector_type: 'openai' | 'm365' | 'azure' | 'generic'
  description?: string
  status?: 'unclaimed' | 'claimed'
  created_at: string
}

/**
 * Represents a Guardrail Policy
 */
export interface Policy {
  id: string
  customer_id: string
  name: string
  description?: string
  agent_id?: string | null
  policy_type: 'pii' | 'content_safety' | 'prompt_injection' | 'custom'
  rule_json?: Record<string, any> | null
  enabled: boolean
  created_at: string
}

/**
 * Request payload for guardrail evaluation
 */
export interface EvaluateRequest {
  agent_id: string
  input_text: string
  context: Record<string, any>
}

/**
 * Response from guardrail evaluation
 */
export interface EvaluateResponse {
  decision: 'ALLOWED' | 'DENIED' | 'WARN'
  reason: string
  checks_run: string[]
  latency_ms?: number
}

/**
 * Extended evaluation result with metadata
 */
export interface EvaluationResult extends EvaluateResponse {
  timestamp: string
  input: string
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: number
  agent_id: string
  policy_id: string
  timestamp: string
  input_hash: string
  decision: 'ALLOWED' | 'DENIED' | 'WARN'
  latency_ms: number
}

/**
 * Form state for registering a new agent
 */
export interface NewAgentForm {
  name: string
  owner_email: string
  connector_type: 'openai' | 'm365' | 'azure' | 'generic'
  description: string
}

/**
 * Form state for creating a new policy
 */
export interface NewPolicyForm {
  name: string
  description: string
  policy_type: 'pii' | 'content_safety' | 'prompt_injection' | 'custom'
  rule_json: Record<string, any>
}

/**
 * Feedback/Toast notification state
 */
export interface Feedback {
  type: 'success' | 'error' | 'info'
  message: string
}

/**
 * Dashboard metrics
 */
export interface DashboardMetrics {
  totalAgents: number
  totalPolicies: number
  recentDenials: number
  totalEvaluations: number
  denyRate: number
  warnRate: number
  allowRate: number
}

