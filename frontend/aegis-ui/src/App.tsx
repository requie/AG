import { useState, useEffect, FC } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Shield, Database, FileText, BarChart3, Activity, Copy, Check, AlertCircle, 
  CheckCircle, AlertTriangle, Eye, EyeOff, Code, ExternalLink, Zap, TrendingUp,
  Users, Lock, Clock, Server
} from 'lucide-react'
import './App.css'
import {
  Agent,
  Policy,
  EvaluateRequest,
  EvaluateResponse,
  EvaluationResult,
  NewAgentForm,
  NewPolicyForm,
  Feedback,
  DashboardMetrics
} from './types'

const API_KEY = 'test-api-key-123'
const DISCOVERY_API = import.meta.env.VITE_DISCOVERY_API_URL || 'http://localhost:8080'
const GUARDRAILS_API = import.meta.env.VITE_GUARDRAILS_API_URL || 'http://localhost:8081'

/**
 * Utility function to format dates
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Utility function to copy text to clipboard
 */
const copyToClipboard = (text: string, setCopied: (value: boolean) => void): void => {
  navigator.clipboard.writeText(text)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}

/**
 * Decision Badge Component - displays the evaluation decision with appropriate styling
 */
interface DecisionBadgeProps {
  decision: 'ALLOWED' | 'DENIED' | 'WARN'
}

const DecisionBadge: FC<DecisionBadgeProps> = ({ decision }) => {
  const variants: Record<string, string> = {
    ALLOWED: 'bg-green-100 text-green-800 border-green-300',
    DENIED: 'bg-red-100 text-red-800 border-red-300',
    WARN: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }
  const icons: Record<string, JSX.Element> = {
    ALLOWED: <CheckCircle className="w-4 h-4" />,
    DENIED: <AlertCircle className="w-4 h-4" />,
    WARN: <AlertTriangle className="w-4 h-4" />
  }
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-semibold text-sm ${variants[decision] || variants.ALLOWED}`}>
      {icons[decision]}
      {decision}
    </span>
  )
}

/**
 * Metric Card Component - displays key metrics in the dashboard
 */
interface MetricCardProps {
  title: string
  value: number | string
  icon: FC<{ className?: string }>
  description?: string
  trend?: string
}

const MetricCard: FC<MetricCardProps> = ({ title, value, icon: Icon, description, trend }) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          {trend && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />{trend}</p>}
        </div>
        <div className="p-3 bg-blue-100 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </CardContent>
  </Card>
)

/**
 * Code Block Component - displays code snippets with copy functionality
 */
interface CodeBlockProps {
  code: string
  language?: string
}

const CodeBlock: FC<CodeBlockProps> = ({ code, language = 'json' }) => {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <button
        onClick={() => copyToClipboard(code, setCopied)}
        className="absolute top-2 right-2 p-2 hover:bg-slate-700 rounded transition-colors"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="pr-10">{code}</pre>
    </div>
  )
}

/**
 * Main App Component
 */
const App: FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [agents, setAgents] = useState<Agent[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationResult[]>([])
  const [newAgent, setNewAgent] = useState<NewAgentForm>({
    name: '',
    owner_email: '',
    connector_type: 'openai',
    description: ''
  })
  const [newPolicy, setNewPolicy] = useState<NewPolicyForm>({
    name: '',
    description: '',
    policy_type: 'pii',
    rule_json: {}
  })
  const [evaluationResult, setEvaluationResult] = useState<EvaluateResponse | null>(null)
  const [evaluationInput, setEvaluationInput] = useState<string>('')
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<Feedback>({ type: 'success', message: '' })
  const [copied, setCopied] = useState<boolean>(false)

  /**
   * Fetch agents from Discovery Service
   */
  const fetchAgents = async (): Promise<void> => {
    try {
      const response = await fetch(`${DISCOVERY_API}/v1/agents`, {
        headers: { 'X-API-Key': API_KEY }
      })
      if (response.ok) {
        const data: Agent[] = await response.json()
        setAgents(data || [])
        if (data && data.length > 0 && !selectedAgent) {
          setSelectedAgent(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      setFeedback({ type: 'error', message: 'Failed to fetch agents' })
    }
  }

  /**
   * Fetch policies from Guardrails Service
   */
  const fetchPolicies = async (): Promise<void> => {
    try {
      const response = await fetch(`${GUARDRAILS_API}/v1/policies`)
      if (response.ok) {
        const data: Policy[] = await response.json()
        setPolicies(data || [])
      }
    } catch (error) {
      console.error('Error fetching policies:', error)
      setFeedback({ type: 'error', message: 'Failed to fetch policies' })
    }
  }

  useEffect(() => {
    fetchAgents()
    fetchPolicies()
  }, [])

  /**
   * Register a new agent
   */
  const registerAgent = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    try {
      const agentData: Agent = {
        id: crypto.randomUUID(),
        ...newAgent,
        created_at: new Date().toISOString()
      }
      const response = await fetch(`${DISCOVERY_API}/v1/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(agentData)
      })
      if (response.ok) {
        setNewAgent({ name: '', owner_email: '', connector_type: 'openai', description: '' })
        setFeedback({ type: 'success', message: 'Agent registered successfully!' })
        fetchAgents()
      } else {
        setFeedback({ type: 'error', message: 'Failed to register agent' })
      }
    } catch (error) {
      console.error('Error registering agent:', error)
      setFeedback({ type: 'error', message: 'Error registering agent' })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create a new policy
   */
  const createPolicy = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    try {
      const policyData: Policy = {
        id: crypto.randomUUID(),
        customer_id: crypto.randomUUID(),
        ...newPolicy,
        enabled: true,
        created_at: new Date().toISOString()
      }
      const response = await fetch(`${GUARDRAILS_API}/v1/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData)
      })
      if (response.ok) {
        setNewPolicy({ name: '', description: '', policy_type: 'pii', rule_json: {} })
        setFeedback({ type: 'success', message: 'Policy created successfully!' })
        fetchPolicies()
      } else {
        setFeedback({ type: 'error', message: 'Failed to create policy' })
      }
    } catch (error) {
      console.error('Error creating policy:', error)
      setFeedback({ type: 'error', message: 'Error creating policy' })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Evaluate guardrails for user input
   */
  const evaluateGuardrails = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!selectedAgent) {
      setFeedback({ type: 'error', message: 'Please select an agent' })
      return
    }
    setLoading(true)
    try {
      const payload: EvaluateRequest = {
        agent_id: selectedAgent,
        input_text: evaluationInput,
        context: { user_id: 'test-user' }
      }
      const response = await fetch(`${GUARDRAILS_API}/v1/guardrails/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        const result: EvaluateResponse = await response.json()
        setEvaluationResult(result)
        const evaluationWithMetadata: EvaluationResult = {
          ...result,
          timestamp: new Date().toISOString(),
          input: evaluationInput
        }
        setEvaluationHistory([evaluationWithMetadata, ...evaluationHistory.slice(0, 19)])
        setFeedback({ type: 'success', message: 'Evaluation completed!' })
      } else {
        setFeedback({ type: 'error', message: 'Failed to evaluate guardrails' })
      }
    } catch (error) {
      console.error('Error evaluating guardrails:', error)
      setFeedback({ type: 'error', message: 'Error evaluating guardrails' })
    } finally {
      setLoading(false)
    }
  }

  // Calculate metrics
  const denyCount = evaluationHistory.filter(e => e.decision === 'DENIED').length
  const warnCount = evaluationHistory.filter(e => e.decision === 'WARN').length
  const allowCount = evaluationHistory.filter(e => e.decision === 'ALLOWED').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AEGIS
                </h1>
                <p className="text-xs text-muted-foreground">AI Agent Security & Governance Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full">API Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedback.message && (
        <div className={`fixed top-20 right-6 p-4 rounded-lg shadow-lg z-40 flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {feedback.message}
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-5 lg:w-auto gap-2 bg-white/50 backdrop-blur-sm p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Policies</span>
            </TabsTrigger>
            <TabsTrigger value="evaluate" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Evaluate</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
              <p className="text-muted-foreground">Overview of your AEGIS platform activity and metrics</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                title="Total Agents" 
                value={agents.length} 
                icon={Users}
                description="Registered AI agents"
              />
              <MetricCard 
                title="Active Policies" 
                value={policies.length} 
                icon={Lock}
                description="Configured guardrails"
              />
              <MetricCard 
                title="Recent Denials" 
                value={denyCount} 
                icon={AlertCircle}
                description="Last 20 evaluations"
                trend={denyCount > 0 ? `${Math.round(denyCount / (evaluationHistory.length || 1) * 100)}% DENY rate` : 'No denials'}
              />
              <MetricCard 
                title="Evaluations" 
                value={evaluationHistory.length} 
                icon={Activity}
                description="Total tests run"
              />
            </div>

            {/* Recent Activity */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Evaluations
                </CardTitle>
                <CardDescription>Last 10 guardrail evaluations</CardDescription>
              </CardHeader>
              <CardContent>
                {evaluationHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No evaluations yet. Start testing in the Evaluate tab.</p>
                ) : (
                  <div className="space-y-3">
                    {evaluationHistory.slice(0, 10).map((eval, idx) => (
                      <div key={idx} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <DecisionBadge decision={eval.decision} />
                              <span className="text-xs text-muted-foreground">{formatDate(eval.timestamp)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{eval.input}</p>
                            <p className="text-xs text-muted-foreground mt-1">{eval.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('agents')}>
                <CardContent className="pt-6">
                  <Users className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-1">Register Agent</h3>
                  <p className="text-sm text-muted-foreground">Add a new AI agent to the platform</p>
                </CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('policies')}>
                <CardContent className="pt-6">
                  <Lock className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold mb-1">Create Policy</h3>
                  <p className="text-sm text-muted-foreground">Define new guardrail policies</p>
                </CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('evaluate')}>
                <CardContent className="pt-6">
                  <Zap className="w-8 h-8 text-amber-600 mb-3" />
                  <h3 className="font-semibold mb-1">Test Guardrails</h3>
                  <p className="text-sm text-muted-foreground">Evaluate agent inputs</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Agents</h2>
              <p className="text-muted-foreground">Discover, register, and manage AI agents</p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Register New Agent</CardTitle>
                <CardDescription>Add a new AI agent to the AEGIS platform</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={registerAgent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name *</Label>
                      <Input
                        id="name"
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                        placeholder="e.g., ChatGPT Integration"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Owner Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newAgent.owner_email}
                        onChange={(e) => setNewAgent({ ...newAgent, owner_email: e.target.value })}
                        placeholder="owner@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="connector">Connector Type *</Label>
                      <select
                        id="connector"
                        value={newAgent.connector_type}
                        onChange={(e) => setNewAgent({ ...newAgent, connector_type: e.target.value as 'openai' | 'm365' | 'azure' | 'generic' })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="m365">Microsoft 365</option>
                        <option value="azure">Azure OpenAI</option>
                        <option value="generic">Generic REST</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={newAgent.description}
                        onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? 'Registering...' : 'Register Agent'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Registered Agents
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">{agents.length} total</span>
                </CardTitle>
                <CardDescription>All registered AI agents in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {agents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No agents registered yet. Register one above to get started.</p>
                ) : (
                  <div className="space-y-3">
                    {agents.map((agent) => (
                      <div key={agent.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{agent.name}</h3>
                            <p className="text-sm text-muted-foreground">{agent.owner_email}</p>
                            {agent.description && <p className="text-sm mt-1">{agent.description}</p>}
                          </div>
                          <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                            {agent.connector_type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>ID: <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{agent.id?.substring(0, 8)}...</code></span>
                          <button
                            onClick={() => copyToClipboard(agent.id, setCopied)}
                            className="hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Policies</h2>
              <p className="text-muted-foreground">Define and manage guardrail policies</p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Create New Policy</CardTitle>
                <CardDescription>Define guardrail policies for agent evaluation</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createPolicy} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="policyName">Policy Name *</Label>
                      <Input
                        id="policyName"
                        value={newPolicy.name}
                        onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                        placeholder="e.g., PII Detection Policy"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="policyType">Policy Type *</Label>
                      <select
                        id="policyType"
                        value={newPolicy.policy_type}
                        onChange={(e) => setNewPolicy({ ...newPolicy, policy_type: e.target.value as 'pii' | 'content_safety' | 'prompt_injection' | 'custom' })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="pii">PII Detection</option>
                        <option value="content_safety">Content Safety</option>
                        <option value="prompt_injection">Prompt Injection</option>
                        <option value="custom">Custom Rules</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policyDesc">Description</Label>
                    <Input
                      id="policyDesc"
                      value={newPolicy.description}
                      onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                      placeholder="Optional description of this policy"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? 'Creating...' : 'Create Policy'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Active Policies
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">{policies.length} total</span>
                </CardTitle>
                <CardDescription>All configured guardrail policies</CardDescription>
              </CardHeader>
              <CardContent>
                {policies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No policies created yet. Create one above to get started.</p>
                ) : (
                  <div className="space-y-3">
                    {policies.map((policy) => (
                      <div key={policy.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{policy.name}</h3>
                            {policy.description && <p className="text-sm text-muted-foreground">{policy.description}</p>}
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            policy.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {policy.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Type: <code className="bg-slate-100 px-2 py-1 rounded font-mono">{policy.policy_type}</code></span>
                          <span>Created: {formatDate(policy.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evaluate Tab */}
          <TabsContent value="evaluate" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Evaluate Guardrails</h2>
              <p className="text-muted-foreground">Test and validate guardrail policies in real-time</p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Interactive Evaluation Tool</CardTitle>
                <CardDescription>Test agent inputs against configured guardrails</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={evaluateGuardrails} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="agentSelect">Select Agent *</Label>
                    <select
                      id="agentSelect"
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Choose an agent...</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inputText">Input Text *</Label>
                    <textarea
                      id="inputText"
                      value={evaluationInput}
                      onChange={(e) => setEvaluationInput(e.target.value)}
                      placeholder="Enter the text you want to evaluate against guardrails..."
                      className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? 'Evaluating...' : 'Evaluate'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Evaluation Result */}
            {evaluationResult && (
              <Card className="shadow-lg border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Evaluation Result</span>
                    <DecisionBadge decision={evaluationResult.decision} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Reason</h4>
                    <p className="text-muted-foreground">{evaluationResult.reason}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Checks Executed</h4>
                    <div className="flex flex-wrap gap-2">
                      {evaluationResult.checks_run && evaluationResult.checks_run.map((check, idx) => (
                        <span key={idx} className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-mono">
                          {check}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Input</p>
                      <p className="text-sm font-mono truncate">{evaluationInput}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Timestamp</p>
                      <p className="text-sm">{formatDate(new Date().toISOString())}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evaluation History */}
            {evaluationHistory.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Evaluation History
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">{evaluationHistory.length} total</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {evaluationHistory.slice(1).map((eval, idx) => (
                      <div key={idx} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <DecisionBadge decision={eval.decision} />
                              <span className="text-xs text-muted-foreground">{formatDate(eval.timestamp)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{eval.input}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* API Documentation Tab */}
          <TabsContent value="api" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">API Documentation</h2>
              <p className="text-muted-foreground">Developer-first API reference and integration guides</p>
            </div>

            {/* Endpoints Overview */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Base URLs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1">Discovery Service</p>
                  <CodeBlock code={DISCOVERY_API} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Guardrails Service</p>
                  <CodeBlock code={GUARDRAILS_API} />
                </div>
              </CardContent>
            </Card>

            {/* Evaluate Endpoint */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>POST /v1/guardrails/evaluate</CardTitle>
                <CardDescription>Evaluate agent input against configured guardrails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request</h4>
                  <CodeBlock code={`{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "input_text": "My SSN is 123-45-6789",
  "context": {
    "user_id": "user_123",
    "session_id": "sess_456"
  }
}`} />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response (ALLOWED)</h4>
                  <CodeBlock code={`{
  "decision": "ALLOWED",
  "reason": "No issues detected.",
  "checks_run": ["PII_Detection", "Content_Safety", "Prompt_Injection"]
}`} />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response (DENIED)</h4>
                  <CodeBlock code={`{
  "decision": "DENIED",
  "reason": "PII detected in prompt.",
  "checks_run": ["PII_Detection"]
}`} />
                </div>
              </CardContent>
            </Card>

            {/* Register Agent Endpoint */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>POST /v1/agents</CardTitle>
                <CardDescription>Register a new AI agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request</h4>
                  <CodeBlock code={`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My ChatGPT Integration",
  "owner_email": "owner@example.com",
  "connector_type": "openai",
  "description": "Production ChatGPT connector",
  "created_at": "2024-01-15T10:30:00Z"
}`} />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <CodeBlock code={`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My ChatGPT Integration",
  "owner_email": "owner@example.com",
  "connector_type": "openai",
  "status": "unclaimed",
  "created_at": "2024-01-15T10:30:00Z"
}`} />
                </div>
              </CardContent>
            </Card>

            {/* Code Examples */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Code Examples</CardTitle>
                <CardDescription>Integration examples in popular languages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Python</h4>
                  <CodeBlock code={`import requests

url = "${GUARDRAILS_API}/v1/guardrails/evaluate"
payload = {
    "agent_id": "agent-uuid",
    "input_text": "User input to evaluate",
    "context": {"user_id": "user_123"}
}

response = requests.post(url, json=payload)
result = response.json()
print(f"Decision: {result['decision']}")
print(f"Reason: {result['reason']}")`} language="python" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">JavaScript/Node.js</h4>
                  <CodeBlock code={`const url = "${GUARDRAILS_API}/v1/guardrails/evaluate";
const payload = {
  agent_id: "agent-uuid",
  input_text: "User input to evaluate",
  context: { user_id: "user_123" }
};

const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});

const result = await response.json();
console.log(\`Decision: \${result.decision}\`);
console.log(\`Reason: \${result.reason}\`);`} language="javascript" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>AEGIS Platform v1.0 | <a href="#" className="hover:text-primary">Documentation</a> • <a href="#" className="hover:text-primary">API Docs</a> • <a href="#" className="hover:text-primary">Support</a></p>
        </div>
      </footer>
    </div>
  )
}

export default App

