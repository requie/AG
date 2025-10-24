import { FC, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Input } from '@/components/ui/input.jsx'
import { AlertCircle, CheckCircle, Copy, Check, Code2, Zap } from 'lucide-react'
import { Policy } from '../types'
import { copyToClipboard } from '../utils'

/**
 * Props for PolicyEditor component
 */
interface PolicyEditorProps {
  onSave: (policy: Policy) => Promise<void>
  loading?: boolean
}

/**
 * Policy templates for quick creation
 */
const POLICY_TEMPLATES: Record<string, Partial<Policy>> = {
  pii_detection: {
    name: 'PII Detection Policy',
    policy_type: 'pii',
    description: 'Detects personally identifiable information in agent inputs',
    rule_json: {
      patterns: [
        { type: 'ssn', pattern: '\\d{3}-\\d{2}-\\d{4}', severity: 'high' },
        { type: 'credit_card', pattern: '\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}', severity: 'high' },
        { type: 'email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', severity: 'medium' },
        { type: 'phone', pattern: '\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}', severity: 'medium' }
      ],
      action: 'DENY'
    }
  },
  content_safety: {
    name: 'Content Safety Policy',
    policy_type: 'content_safety',
    description: 'Detects harmful, violent, or inappropriate content',
    rule_json: {
      categories: [
        { name: 'violence', threshold: 0.7, action: 'DENY' },
        { name: 'hate_speech', threshold: 0.8, action: 'DENY' },
        { name: 'sexual_content', threshold: 0.6, action: 'WARN' }
      ],
      model: 'openai-moderation'
    }
  },
  prompt_injection: {
    name: 'Prompt Injection Detection',
    policy_type: 'prompt_injection',
    description: 'Detects attempts to manipulate agent behavior through prompt injection',
    rule_json: {
      keywords: ['ignore previous', 'forget instructions', 'system prompt', 'jailbreak'],
      patterns: [
        '(?i)(ignore|disregard|forget).{0,20}(previous|prior|earlier|above).{0,20}(instruction|prompt|rule)',
        '(?i)(system|admin).{0,20}(prompt|instruction|mode)',
        '(?i)(jailbreak|bypass|override).{0,20}(filter|restriction|rule)'
      ],
      action: 'WARN'
    }
  },
  custom_rules: {
    name: 'Custom Rules Policy',
    policy_type: 'custom',
    description: 'Define custom rules for specific use cases',
    rule_json: {
      rules: [
        {
          id: 'rule_1',
          name: 'Example Rule',
          condition: 'contains_keyword',
          keywords: ['example'],
          action: 'WARN'
        }
      ]
    }
  }
}

/**
 * Validate JSON string
 */
const validateJSON = (jsonString: string): { valid: boolean; error?: string } => {
  try {
    JSON.parse(jsonString)
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    }
  }
}

/**
 * Format JSON with indentation
 */
const formatJSON = (jsonString: string): string => {
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return jsonString
  }
}

/**
 * PolicyEditor Component - Allows users to create and edit policies using JSON
 */
export const PolicyEditor: FC<PolicyEditorProps> = ({ onSave, loading = false }) => {
  const [policyName, setPolicyName] = useState<string>('')
  const [policyDescription, setPolicyDescription] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('pii_detection')
  const [jsonContent, setJsonContent] = useState<string>(
    JSON.stringify(POLICY_TEMPLATES.pii_detection?.rule_json, null, 2)
  )
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true })
  const [copied, setCopied] = useState<boolean>(false)

  /**
   * Handle template selection
   */
  const handleTemplateSelect = useCallback((templateKey: string) => {
    setSelectedTemplate(templateKey)
    const template = POLICY_TEMPLATES[templateKey]
    if (template) {
      setPolicyName(template.name || '')
      setPolicyDescription(template.description || '')
      setJsonContent(JSON.stringify(template.rule_json, null, 2))
      setValidation({ valid: true })
    }
  }, [])

  /**
   * Handle JSON content change
   */
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value
    setJsonContent(content)
    
    // Validate JSON in real-time
    if (content.trim()) {
      const result = validateJSON(content)
      setValidation(result)
    } else {
      setValidation({ valid: false, error: 'JSON content cannot be empty' })
    }
  }

  /**
   * Format JSON content
   */
  const handleFormatJSON = () => {
    const formatted = formatJSON(jsonContent)
    setJsonContent(formatted)
  }

  /**
   * Handle policy save
   */
  const handleSavePolicy = async () => {
    if (!policyName.trim()) {
      setValidation({ valid: false, error: 'Policy name is required' })
      return
    }

    const jsonValidation = validateJSON(jsonContent)
    if (!jsonValidation.valid) {
      setValidation(jsonValidation)
      return
    }

    try {
      const newPolicy: Policy = {
        id: crypto.randomUUID(),
        customer_id: crypto.randomUUID(),
        name: policyName,
        description: policyDescription,
        policy_type: (POLICY_TEMPLATES[selectedTemplate]?.policy_type || 'custom') as any,
        rule_json: JSON.parse(jsonContent),
        enabled: true,
        created_at: new Date().toISOString()
      }

      await onSave(newPolicy)

      // Reset form
      setPolicyName('')
      setPolicyDescription('')
      setJsonContent(JSON.stringify(POLICY_TEMPLATES.pii_detection?.rule_json, null, 2))
      setSelectedTemplate('pii_detection')
      setValidation({ valid: true })
    } catch (error) {
      setValidation({
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to save policy'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Templates Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Policy Templates
          </CardTitle>
          <CardDescription>Start with a pre-built template or create from scratch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(POLICY_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => handleTemplateSelect(key)}
                className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                  selectedTemplate === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policy Metadata */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Policy Metadata</CardTitle>
          <CardDescription>Configure the basic information for your policy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="policyName">Policy Name *</Label>
            <Input
              id="policyName"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="e.g., PII Detection Policy"
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyDescription">Description</Label>
            <Input
              id="policyDescription"
              value={policyDescription}
              onChange={(e) => setPolicyDescription(e.target.value)}
              placeholder="Optional description of this policy"
              className="text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* JSON Editor */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Policy Rules (JSON)
            </span>
            <button
              onClick={handleFormatJSON}
              className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded transition-colors"
            >
              Format
            </button>
          </CardTitle>
          <CardDescription>Define the rules and conditions for this policy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <textarea
              value={jsonContent}
              onChange={handleJsonChange}
              className={`w-full h-96 p-4 font-mono text-sm rounded-lg border-2 resize-none focus:outline-none transition-colors ${
                validation.valid
                  ? 'border-green-300 focus:border-green-500 bg-green-50'
                  : 'border-red-300 focus:border-red-500 bg-red-50'
              }`}
              spellCheck="false"
            />
            {/* Validation Indicator */}
            <div className="absolute top-4 right-4">
              {validation.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
          </div>

          {/* Validation Message */}
          {!validation.valid && validation.error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="text-xs mt-1">{validation.error}</p>
              </div>
            </div>
          )}

          {/* Copy Button */}
          <button
            onClick={() => copyToClipboard(jsonContent, setCopied)}
            className="flex items-center gap-2 text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3">
        <Button
          onClick={handleSavePolicy}
          disabled={!validation.valid || loading || !policyName.trim()}
          className="flex items-center gap-2"
          size="lg"
        >
          <Zap className="w-4 h-4" />
          {loading ? 'Saving...' : 'Create Policy'}
        </Button>
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> You can edit the JSON directly to customize your policy rules. Use the Format button to auto-indent your JSON. The policy will be validated in real-time.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default PolicyEditor

