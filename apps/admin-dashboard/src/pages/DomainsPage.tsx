import { useState, useEffect } from "react"
import { Plus, Globe, Shield, Activity, AlertTriangle, CheckCircle, Clock, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface Domain {
  id: string
  domain: string
  domain_type: 'custom' | 'subdomain'
  status: 'pending' | 'active' | 'error' | 'suspended'
  ssl_status: 'pending' | 'active' | 'failed' | 'expired'
  ssl_expires_at: string | null
  verification_status: string
  is_primary: boolean
  created_at: string
  tenant_id: string
  metadata: any
}

interface DomainHealthCheck {
  id: string
  status: string
  response_time_ms: number
  ssl_days_remaining: number | null
  created_at: string
  error_message: string | null
}

interface DomainAnalytics {
  requests_count: number
  unique_visitors: number
  bandwidth_bytes: number
  cache_hit_rate: number
  error_rate: number
  date: string
}

// Helper functions
const calculateSSLDaysRemaining = (expiresAt: string | null) => {
  if (!expiresAt) return null
  const expirationDate = new Date(expiresAt)
  const today = new Date()
  const diffTime = expirationDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

const getStatusBadge = (status: string) => {
  const variants = {
    active: "default",
    pending: "secondary",
    error: "destructive",
    suspended: "outline"
  } as const
  
  return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>
}

const getSSLStatusBadge = (sslStatus: string) => {
  const variants = {
    active: "default",
    pending: "secondary", 
    failed: "destructive",
    expired: "destructive"
  } as const
  
  return <Badge variant={variants[sslStatus as keyof typeof variants] || "outline"}>{sslStatus}</Badge>
}

const getHealthStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle className="h-4 w-4 text-success" />
    case 'degraded': return <AlertTriangle className="h-4 w-4 text-warning" />
    case 'unhealthy': return <AlertTriangle className="h-4 w-4 text-destructive" />
    default: return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function DomainsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)

  // Fetch domains
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Domain[]
    }
  })

  // Fetch domain health for selected domain
  const { data: healthChecks = [] } = useQuery({
    queryKey: ['domain-health', selectedDomain?.id],
    queryFn: async () => {
      if (!selectedDomain) return []
      const { data, error } = await supabase
        .from('domain_health_checks')
        .select('*')
        .eq('domain_id', selectedDomain.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      return data as DomainHealthCheck[]
    },
    enabled: !!selectedDomain
  })

  // Fetch domain analytics for selected domain
  const { data: analytics = [] } = useQuery({
    queryKey: ['domain-analytics', selectedDomain?.id],
    queryFn: async () => {
      if (!selectedDomain) return []
      const { data, error } = await supabase
        .from('domain_analytics')
        .select('*')
        .eq('domain_id', selectedDomain.id)
        .order('date', { ascending: false })
        .limit(30)
      
      if (error) throw error
      return data as DomainAnalytics[]
    },
    enabled: !!selectedDomain
  })

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async (domainData: { domain: string; domain_type: string }) => {
      const { data, error } = await supabase.functions.invoke('domain-management', {
        body: {
          action: 'add_domain',
          ...domainData
        }
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({ title: "Domain added successfully" })
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ 
        title: "Failed to add domain", 
        description: error.message,
        variant: "destructive" 
      })
    }
  })

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('domain-management', {
        body: {
          action: 'verify_domain',
          domain_id: domainId
        }
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({ title: "Domain verification checked" })
      queryClient.invalidateQueries({ queryKey: ['domains'] })
    },
    onError: (error) => {
      toast({ 
        title: "Failed to verify domain", 
        description: error.message,
        variant: "destructive" 
      })
    }
  })

  // Check domain health mutation
  const checkHealthMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('domain-management', {
        body: {
          action: 'check_domain_health',
          domain_id: domainId
        }
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({ title: "Health check completed" })
      queryClient.invalidateQueries({ queryKey: ['domain-health'] })
    }
  })


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domain Management</h1>
          <p className="text-muted-foreground">
            Manage custom domains, SSL certificates, and DNS configuration
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Domain</DialogTitle>
              <DialogDescription>
                Add a new custom domain for your tenant booking pages
              </DialogDescription>
            </DialogHeader>
            <AddDomainForm 
              onSubmit={(data) => addDomainMutation.mutate(data)}
              isLoading={addDomainMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Domain Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domains.length}</div>
            <p className="text-xs text-muted-foreground">
              {domains.filter(d => d.status === 'active').length} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SSL Certificates</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {domains.filter(d => d.ssl_status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active SSL certificates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {Math.round((domains.filter(d => d.status === 'active').length / domains.length) * 100) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Domains healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {domains.filter(d => {
                const daysRemaining = calculateSSLDaysRemaining(d.ssl_expires_at)
                return daysRemaining !== null && daysRemaining < 30
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              SSL certs expiring in 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="health">Health Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="dns">DNS Management</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain List</CardTitle>
              <CardDescription>
                Manage your custom domains and SSL certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DomainTable 
                domains={domains}
                isLoading={isLoading}
                onVerify={(id) => verifyDomainMutation.mutate(id)}
                onCheckHealth={(id) => checkHealthMutation.mutate(id)}
                onSelect={setSelectedDomain}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Health Monitoring</CardTitle>
              <CardDescription>
                Real-time health status and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HealthMonitoring 
                domains={domains}
                healthChecks={healthChecks}
                selectedDomain={selectedDomain}
                onSelectDomain={setSelectedDomain}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Analytics</CardTitle>
              <CardDescription>
                Traffic, performance, and usage analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DomainAnalytics 
                analytics={analytics}
                selectedDomain={selectedDomain}
                onSelectDomain={setSelectedDomain}
                domains={domains}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DNS Management</CardTitle>
              <CardDescription>
                Configure DNS records and domain settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DNSManagement 
                selectedDomain={selectedDomain}
                onSelectDomain={setSelectedDomain}
                domains={domains}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AddDomainForm({ onSubmit, isLoading }: { 
  onSubmit: (data: { domain: string; domain_type: string }) => void
  isLoading: boolean 
}) {
  const [domain, setDomain] = useState("")
  const [domainType, setDomainType] = useState("custom")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ domain, domain_type: domainType })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="domain">Domain Name</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain-type">Domain Type</Label>
        <Select value={domainType} onValueChange={setDomainType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom Domain</SelectItem>
            <SelectItem value="subdomain">Subdomain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Adding..." : "Add Domain"}
      </Button>
    </form>
  )
}

function DomainTable({ 
  domains, 
  isLoading, 
  onVerify, 
  onCheckHealth, 
  onSelect 
}: {
  domains: Domain[]
  isLoading: boolean
  onVerify: (id: string) => void
  onCheckHealth: (id: string) => void
  onSelect: (domain: Domain) => void
}) {
  if (isLoading) {
    return <div>Loading domains...</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Domain</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>SSL Status</TableHead>
          <TableHead>SSL Expires</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {domains.map((domain) => {
          const sslDaysRemaining = calculateSSLDaysRemaining(domain.ssl_expires_at)
          
          return (
            <TableRow key={domain.id} className="cursor-pointer" onClick={() => onSelect(domain)}>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <span>{domain.domain}</span>
                  {domain.is_primary && <Badge variant="outline">Primary</Badge>}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell>{domain.domain_type}</TableCell>
              <TableCell>{getStatusBadge(domain.status)}</TableCell>
              <TableCell>{getSSLStatusBadge(domain.ssl_status)}</TableCell>
              <TableCell>
                {sslDaysRemaining !== null ? (
                  <span className={sslDaysRemaining < 30 ? "text-warning" : ""}>
                    {sslDaysRemaining} days
                  </span>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onVerify(domain.id)
                    }}
                  >
                    Verify
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCheckHealth(domain.id)
                    }}
                  >
                    Check Health
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// Component placeholders for other tabs
function HealthMonitoring({ domains, healthChecks, selectedDomain, onSelectDomain }: any) {
  return (
    <div className="space-y-4">
      <Select value={selectedDomain?.id || ""} onValueChange={(value) => {
        const domain = domains.find((d: Domain) => d.id === value)
        onSelectDomain(domain)
      }}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a domain to monitor" />
        </SelectTrigger>
        <SelectContent>
          {domains.map((domain: Domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              {domain.domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedDomain && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {healthChecks.slice(0, 3).map((check: DomainHealthCheck) => (
              <Card key={check.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getHealthStatusIcon(check.status)}
                    <span className="ml-2">Health Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{check.status}</div>
                  <p className="text-xs text-muted-foreground">
                    Response time: {check.response_time_ms}ms
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>SSL Days Remaining</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {healthChecks.map((check: DomainHealthCheck) => (
                <TableRow key={check.id}>
                  <TableCell>{new Date(check.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getHealthStatusIcon(check.status)}
                      <span className="capitalize">{check.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>{check.response_time_ms}ms</TableCell>
                  <TableCell>
                    {check.ssl_days_remaining !== null ? `${check.ssl_days_remaining} days` : "N/A"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {check.error_message || "None"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function DomainAnalytics({ analytics, selectedDomain, onSelectDomain, domains }: any) {
  return (
    <div className="space-y-4">
      <Select value={selectedDomain?.id || ""} onValueChange={(value) => {
        const domain = domains.find((d: Domain) => d.id === value)
        onSelectDomain(domain)
      }}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a domain for analytics" />
        </SelectTrigger>
        <SelectContent>
          {domains.map((domain: Domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              {domain.domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedDomain && analytics.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.reduce((sum: number, a: DomainAnalytics) => sum + a.requests_count, 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.reduce((sum: number, a: DomainAnalytics) => sum + a.unique_visitors, 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatBytes(analytics.reduce((sum: number, a: DomainAnalytics) => sum + a.bandwidth_bytes, 0))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics.reduce((sum: number, a: DomainAnalytics) => sum + a.cache_hit_rate, 0) / analytics.length).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Visitors</TableHead>
                <TableHead>Bandwidth</TableHead>
                <TableHead>Cache Hit Rate</TableHead>
                <TableHead>Error Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((day: DomainAnalytics) => (
                <TableRow key={day.date}>
                  <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                  <TableCell>{day.requests_count.toLocaleString()}</TableCell>
                  <TableCell>{day.unique_visitors.toLocaleString()}</TableCell>
                  <TableCell>{formatBytes(day.bandwidth_bytes)}</TableCell>
                  <TableCell>{day.cache_hit_rate.toFixed(1)}%</TableCell>
                  <TableCell className={day.error_rate > 5 ? "text-destructive" : ""}>
                    {day.error_rate.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function DNSManagement({ selectedDomain, onSelectDomain, domains }: any) {
  return (
    <div className="space-y-4">
      <Select value={selectedDomain?.id || ""} onValueChange={(value) => {
        const domain = domains.find((d: Domain) => d.id === value)
        onSelectDomain(domain)
      }}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a domain to manage DNS" />
        </SelectTrigger>
        <SelectContent>
          {domains.map((domain: Domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              {domain.domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedDomain && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DNS Configuration</CardTitle>
              <CardDescription>
                Configure DNS records for {selectedDomain.domain}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                DNS management interface coming soon. For now, please configure DNS records manually:
              </p>
              <div className="mt-4 space-y-2 font-mono text-sm bg-muted p-4 rounded-md">
                <div>CNAME: {selectedDomain.domain} → your-app.blunari.ai</div>
                <div>TXT: _blunari-verification → {selectedDomain.verification_record}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

