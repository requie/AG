import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Shield, Database, FileText } from 'lucide-react'
import './App.css'

const API_KEY = 'test-api-key-123'
const DISCOVERY_API = import.meta.env.VITE_DISCOVERY_API_URL || 'http://localhost:8080'
const GUARDRAILS_API = import.meta.env.VITE_GUARDRAILS_API_URL || 'http://localhost:8081'

function App() {
  const [agents, setAgents] = useState([])
  const [policies, setPolicies] = useState([])
  const [newAgent, setNewAgent] = useState({ name: '', owner_email: '', connector_type: 'openai' })
  const [newPolicy, setNewPolicy] = useState({ name: '', policy_type: 'pii', rule_json: {} })
  const [evaluationResult, setEvaluationResult] = useState(null)
  const [evaluationInput, setEvaluationInput] = useState('')

  useEffect(() => {
    fetchAgents()
    fetchPolicies()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${DISCOVERY_API}/v1/agents`, {
        headers: { 'X-API-Key': API_KEY }
      })
      if (response.ok) {
        const data = await response.json()
        setAgents(data || [])
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchPolicies = async () => {
    try {
      const response = await fetch(`${GUARDRAILS_API}/v1/policies`)
      if (response.ok) {
        const data = await response.json()
        setPolicies(data || [])
      }
    } catch (error) {
      console.error('Error fetching policies:', error)
    }
  }

  const registerAgent = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${DISCOVERY_API}/v1/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(newAgent)
      })
      if (response.ok) {
        setNewAgent({ name: '', owner_email: '', connector_type: 'openai' })
        fetchAgents()
      }
    } catch (error) {
      console.error('Error registering agent:', error)
    }
  }

  const createPolicy = async (e) => {
    e.preventDefault()
    try {
      const policyData = {
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
        setNewPolicy({ name: '', policy_type: 'pii', rule_json: {} })
        fetchPolicies()
      }
    } catch (error) {
      console.error('Error creating policy:', error)
    }
  }

  const evaluateGuardrails = async (e) => {
    e.preventDefault()
    if (!agents.length) {
      alert('Please register an agent first')
      return
    }
    try {
      const response = await fetch(`${GUARDRAILS_API}/v1/guardrails/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agents[0].id,
          input_text: evaluationInput,
          context: { user_id: 'test-user' }
        })
      })
      if (response.ok) {
        const result = await response.json()
        setEvaluationResult(result)
      }
    } catch (error) {
      console.error('Error evaluating guardrails:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AEGIS
            </h1>
            <span className="text-sm text-muted-foreground">AI Agent Security & Governance Platform</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="evaluate" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Evaluate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Register New Agent</CardTitle>
                <CardDescription>Add a new AI agent to the AEGIS platform</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={registerAgent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name</Label>
                      <Input
                        id="name"
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                        placeholder="My AI Agent"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Owner Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newAgent.owner_email}
                        onChange={(e) => setNewAgent({ ...newAgent, owner_email: e.target.value })}
                        placeholder="owner@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="connector">Connector Type</Label>
                      <select
                        id="connector"
                        value={newAgent.connector_type}
                        onChange={(e) => setNewAgent({ ...newAgent, connector_type: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="m365">Microsoft 365</option>
                        <option value="generic">Generic REST</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full md:w-auto">Register Agent</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Registered Agents</CardTitle>
                <CardDescription>View all agents in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No agents registered yet</p>
                  ) : (
                    agents.map((agent) => (
                      <div key={agent.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{agent.name}</h3>
                            <p className="text-sm text-muted-foreground">{agent.owner_email}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {agent.connector_type}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Status: <span className="font-medium">{agent.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Create New Policy</CardTitle>
                <CardDescription>Define guardrail policies for agent evaluation</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createPolicy} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="policyName">Policy Name</Label>
                      <Input
                        id="policyName"
                        value={newPolicy.name}
                        onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                        placeholder="PII Detection Policy"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="policyType">Policy Type</Label>
                      <select
                        id="policyType"
                        value={newPolicy.policy_type}
                        onChange={(e) => setNewPolicy({ ...newPolicy, policy_type: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="pii">PII Detection</option>
                        <option value="content_safety">Content Safety</option>
                        <option value="custom">Custom Rules</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full md:w-auto">Create Policy</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Active Policies</CardTitle>
                <CardDescription>View all configured policies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {policies.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No policies configured yet</p>
                  ) : (
                    policies.map((policy) => (
                      <div key={policy.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{policy.name}</h3>
                            <p className="text-sm text-muted-foreground">Type: {policy.policy_type}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${policy.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-700'}`}>
                            {policy.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluate" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Evaluate Guardrails</CardTitle>
                <CardDescription>Test agent input against configured policies</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={evaluateGuardrails} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inputText">Input Text</Label>
                    <textarea
                      id="inputText"
                      value={evaluationInput}
                      onChange={(e) => setEvaluationInput(e.target.value)}
                      placeholder="Enter text to evaluate (e.g., 'My SSN is 123-45-6789')"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full md:w-auto">Evaluate</Button>
                </form>

                {evaluationResult && (
                  <div className="mt-6 p-6 border rounded-lg bg-accent/20">
                    <h3 className="font-semibold mb-4">Evaluation Result</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Decision:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          evaluationResult.decision === 'ALLOWED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          evaluationResult.decision === 'DENIED' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {evaluationResult.decision}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Reason:</span>
                        <p className="text-sm text-muted-foreground mt-1">{evaluationResult.reason}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Checks Run:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {evaluationResult.checks_run.map((check, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary">
                              {check}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App

