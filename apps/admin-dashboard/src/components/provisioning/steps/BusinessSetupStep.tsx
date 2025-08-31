import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Clock, Users, Eye, EyeOff, User, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProvisioningData } from '../ProvisioningWizard'

interface BusinessSetupStepProps {
  data: ProvisioningData
  updateData: (updates: Partial<ProvisioningData>) => void
}

const timeOptions = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30'
]

const weekDays = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export function BusinessSetupStep({ data, updateData }: BusinessSetupStepProps) {
  const [showPassword, setShowPassword] = React.useState(false)

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    updateData({ ownerPassword: password })
  }

  const updateBusinessHours = (dayIndex: number, field: string, value: any) => {
    const newHours = [...data.businessHours]
    newHours[dayIndex] = { ...newHours[dayIndex], [field]: value }
    updateData({ businessHours: newHours })
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Business Configuration</h2>
        <p className="text-muted-foreground">Set up your operating hours and administrative access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Owner Account
          </CardTitle>
          <CardDescription>
            Administrative account for managing your restaurant dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ownerFirstName" className="text-sm font-medium">
                First Name *
              </Label>
              <Input
                id="ownerFirstName"
                placeholder="John"
                value={data.ownerFirstName}
                onChange={(e) => updateData({ ownerFirstName: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerLastName" className="text-sm font-medium">
                Last Name *
              </Label>
              <Input
                id="ownerLastName"
                placeholder="Smith"
                value={data.ownerLastName}
                onChange={(e) => updateData({ ownerLastName: e.target.value })}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail" className="text-sm font-medium">
              Admin Email *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="ownerEmail"
                type="email"
                placeholder="admin@restaurant.com"
                value={data.ownerEmail}
                onChange={(e) => updateData({ ownerEmail: e.target.value })}
                className="h-11 pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">This will be your login email for the dashboard</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerPassword" className="text-sm font-medium">
              Password *
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="ownerPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={data.ownerPassword}
                  onChange={(e) => updateData({ ownerPassword: e.target.value })}
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                className="h-11 px-4"
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Use at least 8 characters with letters, numbers, and symbols</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Operating Hours
          </CardTitle>
          <CardDescription>
            Define when your restaurant is open for reservations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weekDays.map((day, index) => (
            <div key={day} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-20 text-sm font-medium text-foreground">
                  {day}
                </div>
                <Switch
                  checked={data.businessHours[index]?.isOpen || false}
                  onCheckedChange={(checked) => updateBusinessHours(index, 'isOpen', checked)}
                />
              </div>
              
              {data.businessHours[index]?.isOpen && (
                <div className="flex items-center gap-2">
                  <Select
                    value={data.businessHours[index]?.openTime || '09:00'}
                    onValueChange={(value) => updateBusinessHours(index, 'openTime', value)}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span className="text-sm text-muted-foreground">to</span>
                  
                  <Select
                    value={data.businessHours[index]?.closeTime || '22:00'}
                    onValueChange={(value) => updateBusinessHours(index, 'closeTime', value)}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {!data.businessHours[index]?.isOpen && (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Party Size Configuration
          </CardTitle>
          <CardDescription>
            Set reservation limits and party size preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="minPartySize" className="text-sm font-medium">
                Minimum Party Size
              </Label>
              <Select
                value={data.partySizeConfig.minPartySize.toString()}
                onValueChange={(value) => updateData({
                  partySizeConfig: { 
                    ...data.partySizeConfig, 
                    minPartySize: parseInt(value) 
                  }
                })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPartySize" className="text-sm font-medium">
                Maximum Party Size
              </Label>
              <Select
                value={data.partySizeConfig.maxPartySize.toString()}
                onValueChange={(value) => updateData({
                  partySizeConfig: { 
                    ...data.partySizeConfig, 
                    maxPartySize: parseInt(value) 
                  }
                })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 6, 8, 10, 12, 15, 20].map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultPartySize" className="text-sm font-medium">
                Default Party Size
              </Label>
              <Select
                value={data.partySizeConfig.defaultPartySize.toString()}
                onValueChange={(value) => updateData({
                  partySizeConfig: { 
                    ...data.partySizeConfig, 
                    defaultPartySize: parseInt(value) 
                  }
                })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Allow Large Parties</Label>
              <p className="text-xs text-muted-foreground">
                Enable reservations for parties larger than {data.partySizeConfig.largePartyThreshold} people
              </p>
            </div>
            <Switch
              checked={data.partySizeConfig.allowLargeParties}
              onCheckedChange={(checked) => updateData({
                partySizeConfig: { 
                  ...data.partySizeConfig, 
                  allowLargeParties: checked 
                }
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}