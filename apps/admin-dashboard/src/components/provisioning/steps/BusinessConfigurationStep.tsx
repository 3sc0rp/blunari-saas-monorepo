import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Clock, Globe, Users, Calendar } from 'lucide-react'
import type { ProvisioningData } from '../ProvisioningWizard'

interface BusinessConfigurationStepProps {
  data: ProvisioningData
  updateData: (updates: Partial<ProvisioningData>) => void
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
]

const DAYS = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
]

export function BusinessConfigurationStep({ data, updateData }: BusinessConfigurationStepProps) {
  const updateBusinessHours = (dayOfWeek: number, updates: Partial<typeof data.businessHours[0]>) => {
    const newHours = data.businessHours.map(h => 
      h.dayOfWeek === dayOfWeek ? { ...h, ...updates } : h
    )
    updateData({ businessHours: newHours })
  }

  const updatePartySizeConfig = (updates: Partial<typeof data.partySizeConfig>) => {
    updateData({ partySizeConfig: { ...data.partySizeConfig, ...updates } })
  }

  const copyHoursToAll = (sourceDay: number) => {
    const sourceHours = data.businessHours.find(h => h.dayOfWeek === sourceDay)
    if (!sourceHours) return

    const newHours = data.businessHours.map(h => ({
      ...h,
      isOpen: sourceHours.isOpen,
      openTime: sourceHours.openTime,
      closeTime: sourceHours.closeTime
    }))
    updateData({ businessHours: newHours })
  }

  return (
    <div className="space-y-6">
      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Location & Timezone
          </CardTitle>
          <CardDescription>
            Set your restaurant's timezone for accurate booking times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone *</Label>
            <Select
              value={data.timezone}
              onValueChange={(value) => updateData({ timezone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours
          </CardTitle>
          <CardDescription>
            Set your restaurant's operating hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day) => {
            const dayHours = data.businessHours.find(h => h.dayOfWeek === day.id)
            return (
              <div key={day.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="min-w-20">
                  <span className="font-medium">{day.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={dayHours?.isOpen || false}
                    onCheckedChange={(checked) => 
                      updateBusinessHours(day.id, { 
                        isOpen: checked,
                        openTime: checked && !dayHours?.openTime ? '09:00' : dayHours?.openTime,
                        closeTime: checked && !dayHours?.closeTime ? '22:00' : dayHours?.closeTime
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {dayHours?.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>

                {dayHours?.isOpen && (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={dayHours.openTime || '09:00'}
                      onChange={(e) => updateBusinessHours(day.id, { openTime: e.target.value })}
                      className="w-auto"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={dayHours.closeTime || '22:00'}
                      onChange={(e) => updateBusinessHours(day.id, { closeTime: e.target.value })}
                      className="w-auto"
                    />
                    
                    <button
                      type="button"
                      onClick={() => copyHoursToAll(day.id)}
                      className="ml-auto text-xs text-primary hover:text-primary/80"
                    >
                      Copy to all
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Party Size Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Party Size Settings
          </CardTitle>
          <CardDescription>
            Configure booking limits and default party sizes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPartySize">Minimum Party Size</Label>
              <Input
                id="minPartySize"
                type="number"
                min="1"
                value={data.partySizeConfig.minPartySize}
                onChange={(e) => updatePartySizeConfig({ minPartySize: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPartySize">Maximum Party Size</Label>
              <Input
                id="maxPartySize"
                type="number"
                min="1"
                value={data.partySizeConfig.maxPartySize}
                onChange={(e) => updatePartySizeConfig({ maxPartySize: parseInt(e.target.value) || 12 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPartySize">Default Party Size</Label>
              <Input
                id="defaultPartySize"
                type="number"
                min="1"
                value={data.partySizeConfig.defaultPartySize}
                onChange={(e) => updatePartySizeConfig({ defaultPartySize: parseInt(e.target.value) || 2 })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Allow Large Parties</Label>
                <p className="text-sm text-muted-foreground">
                  Enable bookings for large groups that may require special arrangements
                </p>
              </div>
              <Switch
                checked={data.partySizeConfig.allowLargeParties}
                onCheckedChange={(checked) => updatePartySizeConfig({ allowLargeParties: checked })}
              />
            </div>

            {data.partySizeConfig.allowLargeParties && (
              <div className="space-y-2">
                <Label htmlFor="largePartyThreshold">Large Party Threshold</Label>
                <Input
                  id="largePartyThreshold"
                  type="number"
                  min="2"
                  value={data.partySizeConfig.largePartyThreshold}
                  onChange={(e) => updatePartySizeConfig({ largePartyThreshold: parseInt(e.target.value) || 8 })}
                />
                <p className="text-sm text-muted-foreground">
                  Parties of this size or larger will be flagged as large parties
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}