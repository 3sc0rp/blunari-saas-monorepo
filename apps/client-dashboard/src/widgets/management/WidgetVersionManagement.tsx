import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Download,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Zap,
  Flag,
  Eye,
  Save,
  Copy,
  Trash2,
  ArrowRight,
  TrendingUp,
  Shield,
  Rocket
} from 'lucide-react'
import { formatDistance } from 'date-fns'

interface WidgetVersion {
  id: string
  version_number: string
  config: any
  status: 'draft' | 'testing' | 'staging' | 'production' | 'deprecated' | 'archived'
  deployment_strategy: 'immediate' | 'gradual' | 'scheduled' | 'canary'
  rollout_percentage: number
  feature_flags: Record<string, any>
  changelog: string
  created_at: string
  deployed_at: string | null
  rolled_back_at: string | null
  rollback_reason: string | null
}

interface WidgetDeployment {
  id: string
  environment: 'development' | 'staging' | 'production'
  deployment_type: 'full' | 'canary' | 'gradual' | 'rollback'
  start_time: string
  completion_time: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
  rollout_percentage: number
  metrics: Record<string, any>
  error_details: string | null
}

interface FeatureFlag {
  id: string
  flag_key: string
  flag_name: string
  description: string
  flag_type: 'boolean' | 'string' | 'number' | 'json'
  default_value: any
  is_enabled: boolean
  targeting_rules: any[]
}

interface WidgetExperiment {
  id: string
  experiment_name: string
  description: string
  control_version_id: string
  treatment_version_id: string
  traffic_allocation: { control: number; treatment: number }
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived'
  start_date: string | null
  end_date: string | null
  results: Record<string, any>
  statistical_significance: number | null
  winner_version_id: string | null
}

interface WidgetVersionManagementProps {
  widgetId: string
  className?: string
}

const WidgetVersionManagement: React.FC<WidgetVersionManagementProps> = ({
  widgetId,
  className = ''
}) => {
  const [versions, setVersions] = useState<WidgetVersion[]>([])
  const [deployments, setDeployments] = useState<WidgetDeployment[]>([])
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [experiments, setExperiments] = useState<WidgetExperiment[]>([])
  const [selectedVersion, setSelectedVersion] = useState<WidgetVersion | null>(null)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New version form state
  const [newVersion, setNewVersion] = useState({
    version_number: '',
    changelog: '',
    deployment_strategy: 'immediate' as 'immediate' | 'gradual' | 'scheduled' | 'canary',
    rollout_percentage: 100,
    feature_flags: {} as Record<string, any>
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production': return 'bg-green-100 text-green-800'
      case 'staging': return 'bg-blue-100 text-blue-800'
      case 'testing': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'deprecated': return 'bg-red-100 text-red-800'
      case 'archived': return 'bg-gray-100 text-gray-600'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'running': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'production': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'failed': return <AlertTriangle className="w-4 h-4" />
      case 'running': return <Play className="w-4 h-4" />
      case 'paused': return <Pause className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const fetchVersions = async () => {
    try {
      // TODO: Replace with real API call (e.g., /api/widgets/versions?widgetId=...)
      // const res = await fetch(`/api/widgets/versions?widgetId=${widgetId}`)
      // const data: WidgetVersion[] = await res.json()
      // setVersions(data)
      setVersions([]) // Real-data-only: no mock fallback
    } catch (err) {
      setError('Failed to fetch widget versions')
      setVersions([])
    }
  }

  const fetchDeployments = async () => {
    try {
      // TODO: Replace with real API call (e.g., /api/widgets/deployments)
      setDeployments([])
    } catch (err) {
      setError('Failed to fetch deployments')
      setDeployments([])
    }
  }

  const fetchFeatureFlags = async () => {
    try {
      // TODO: Replace with real API call (e.g., /api/feature-flags?scope=widget)
      setFeatureFlags([])
    } catch (err) {
      setError('Failed to fetch feature flags')
      setFeatureFlags([])
    }
  }

  const fetchExperiments = async () => {
    try {
      // TODO: Replace with real API call (e.g., /api/widgets/experiments)
      setExperiments([])
    } catch (err) {
      setError('Failed to fetch experiments')
      setExperiments([])
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchVersions(),
        fetchDeployments(),
        fetchFeatureFlags(),
        fetchExperiments()
      ])
      setLoading(false)
    }
    
    loadData()
  }, [widgetId])

  const createNewVersion = async () => {
    setIsCreatingVersion(true)
    try {
      // This would be an actual API call
      // Creating new version with provided details
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 2000))
      await fetchVersions()
      
      setNewVersion({
        version_number: '',
        changelog: '',
        deployment_strategy: 'immediate',
        rollout_percentage: 100,
        feature_flags: {}
      })
    } catch (err) {
      setError('Failed to create new version')
    } finally {
      setIsCreatingVersion(false)
    }
  }

  const deployVersion = async (versionId: string, environment: string, strategy: string) => {
    setIsDeploying(true)
    try {
      // Deploying version to specified environment
      
      // Mock deployment
      await new Promise(resolve => setTimeout(resolve, 3000))
      await fetchDeployments()
    } catch (err) {
      setError('Failed to deploy version')
    } finally {
      setIsDeploying(false)
    }
  }

  const rollbackVersion = async (versionId: string, reason: string) => {
    try {
      // Rolling back version with provided reason
      
      // Mock rollback
      await new Promise(resolve => setTimeout(resolve, 2000))
      await fetchVersions()
      await fetchDeployments()
    } catch (err) {
      setError('Failed to rollback version')
    }
  }

  const toggleFeatureFlag = async (flagId: string, enabled: boolean) => {
    try {
      // Toggling feature flag state
      
      setFeatureFlags(prev => prev.map(flag => 
        flag.id === flagId ? { ...flag, is_enabled: enabled } : flag
      ))
    } catch (err) {
      setError('Failed to toggle feature flag')
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className={`border-red-200 ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Widget Version Management</h2>
          <p className="text-gray-600">Manage widget versions, deployments, and feature flags</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Create New Version
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Widget Version</DialogTitle>
              <DialogDescription>
                Create a new version of your widget with updated configuration and features
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="version-number">Version Number</Label>
                <Input
                  id="version-number"
                  placeholder="e.g., 2.2.0, 1.5.0-beta"
                  value={newVersion.version_number}
                  onChange={(e) => setNewVersion(prev => ({ ...prev, version_number: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="changelog">Changelog</Label>
                <Textarea
                  id="changelog"
                  placeholder="Describe the changes in this version..."
                  value={newVersion.changelog}
                  onChange={(e) => setNewVersion(prev => ({ ...prev, changelog: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="deployment-strategy">Deployment Strategy</Label>
                <Select
                  value={newVersion.deployment_strategy}
                  onValueChange={(value: any) => setNewVersion(prev => ({ ...prev, deployment_strategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate (100%)</SelectItem>
                    <SelectItem value="gradual">Gradual Rollout</SelectItem>
                    <SelectItem value="canary">Canary (10%)</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newVersion.deployment_strategy === 'gradual' && (
                <div>
                  <Label>Initial Rollout Percentage: {newVersion.rollout_percentage}%</Label>
                  <Slider
                    value={[newVersion.rollout_percentage]}
                    onValueChange={([value]) => setNewVersion(prev => ({ ...prev, rollout_percentage: value }))}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>
              )}
              
              <Button 
                onClick={createNewVersion} 
                disabled={isCreatingVersion || !newVersion.version_number}
                className="w-full"
              >
                {isCreatingVersion ? 'Creating...' : 'Create Version'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="versions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="versions" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="deployments" className="flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="experiments" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            A/B Tests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="space-y-4">
          {versions.map((version) => (
            <Card key={version.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(version.status)}>
                      {getStatusIcon(version.status)}
                      <span className="ml-1 capitalize">{version.status}</span>
                    </Badge>
                    <div>
                      <h3 className="font-semibold text-lg">v{version.version_number}</h3>
                      <p className="text-sm text-gray-600">
                        Created {formatDistance(new Date(version.created_at), new Date(), { addSuffix: true })}
                        {version.deployed_at && (
                          <span>
                            • Deployed {formatDistance(new Date(version.deployed_at), new Date(), { addSuffix: true })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {version.status === 'production' && (
                      <>
                        <span className="text-sm text-gray-600">
                          {version.rollout_percentage}% rollout
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rollbackVersion(version.id, 'Manual rollback')}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Rollback
                        </Button>
                      </>
                    )}
                    
                    {version.status === 'staging' && (
                      <Button
                        size="sm"
                        onClick={() => deployVersion(version.id, 'production', version.deployment_strategy)}
                        disabled={isDeploying}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Deploy to Production
                      </Button>
                    )}
                    
                    {version.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deployVersion(version.id, 'staging', 'immediate')}
                        disabled={isDeploying}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Deploy to Staging
                      </Button>
                    )}
                  </div>
                </div>
                
                {version.changelog && (
                  <p className="text-gray-700 mb-3">{version.changelog}</p>
                )}
                
                {version.rolled_back_at && version.rollback_reason && (
                  <Alert className="border-red-200 mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Rolled back:</strong> {version.rollback_reason}
                      <span className="text-sm text-gray-500 block">
                        {formatDistance(new Date(version.rolled_back_at), new Date(), { addSuffix: true })}
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Settings className="w-4 h-4" />
                    <span>{version.deployment_strategy} strategy</span>
                  </span>
                  
                  {Object.keys(version.feature_flags).length > 0 && (
                    <span className="flex items-center space-x-1">
                      <Flag className="w-4 h-4" />
                      <span>{Object.keys(version.feature_flags).length} feature flags</span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          {deployments.map((deployment) => (
            <Card key={deployment.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(deployment.status)}>
                      {getStatusIcon(deployment.status)}
                      <span className="ml-1 capitalize">{deployment.status}</span>
                    </Badge>
                    <div>
                      <h3 className="font-semibold">{deployment.environment}</h3>
                      <p className="text-sm text-gray-600">
                        {deployment.deployment_type} deployment • {deployment.rollout_percentage}% traffic
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Started {formatDistance(new Date(deployment.start_time), new Date(), { addSuffix: true })}
                    </p>
                    {deployment.completion_time && (
                      <p className="text-sm text-gray-600">
                        Completed {formatDistance(new Date(deployment.completion_time), new Date(), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
                
                {deployment.metrics && Object.keys(deployment.metrics).length > 0 && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    {Object.entries(deployment.metrics).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                        <p className="font-semibold">
                          {typeof value === 'number' 
                            ? key.includes('rate') 
                              ? `${value}%` 
                              : key.includes('time') 
                                ? `${value}ms` 
                                : value
                            : value
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {deployment.error_details && (
                  <Alert className="border-red-200 mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{deployment.error_details}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          {featureFlags.map((flag) => (
            <Card key={flag.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold">{flag.flag_name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {flag.flag_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{flag.description}</p>
                    <p className="text-xs text-gray-500">Key: {flag.flag_key}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {flag.is_enabled ? 'Enabled' : 'Disabled'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Default: {String(flag.default_value)}
                      </p>
                    </div>
                    <Switch
                      checked={flag.is_enabled}
                      onCheckedChange={(enabled) => toggleFeatureFlag(flag.id, enabled)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          {experiments.map((experiment) => (
            <Card key={experiment.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold">{experiment.experiment_name}</h3>
                      <Badge className={getStatusColor(experiment.status)}>
                        {getStatusIcon(experiment.status)}
                        <span className="ml-1 capitalize">{experiment.status}</span>
                      </Badge>
                      {experiment.winner_version_id && (
                        <Badge className="bg-green-100 text-green-800">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Winner Selected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{experiment.description}</p>
                  </div>
                  
                  {experiment.status === 'draft' && (
                    <Button size="sm">
                      <Play className="w-4 h-4 mr-1" />
                      Start Experiment
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Control (A)</h4>
                    <p className="text-xs text-gray-600">Version {experiment.control_version_id}</p>
                    <p className="text-sm font-semibold">{experiment.traffic_allocation.control}% traffic</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Treatment (B)</h4>
                    <p className="text-xs text-gray-600">Version {experiment.treatment_version_id}</p>
                    <p className="text-sm font-semibold">{experiment.traffic_allocation.treatment}% traffic</p>
                  </div>
                </div>
                
                {experiment.results && Object.keys(experiment.results).length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Results</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(experiment.results).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                          <p className="font-semibold">
                            {typeof value === 'number' && key.includes('lift') ? `+${value}%` : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {experiment.statistical_significance && (
                      <p className="text-xs text-gray-600 mt-2">
                        Statistical significance: {(experiment.statistical_significance * 100).toFixed(2)}%
                        {experiment.statistical_significance < 0.05 && 
                          <span className="text-green-600 font-medium"> (Significant)</span>
                        }
                      </p>
                    )}
                  </div>
                )}
                
                {experiment.start_date && experiment.end_date && (
                  <p className="text-xs text-gray-500 mt-2">
                    Ran from {new Date(experiment.start_date).toLocaleDateString()} to {new Date(experiment.end_date).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default WidgetVersionManagement