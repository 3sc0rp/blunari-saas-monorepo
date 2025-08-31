import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import type { ProvisioningData } from '../ProvisioningWizard'

interface LocationStepProps {
  data: ProvisioningData
  updateData: (updates: Partial<ProvisioningData>) => void
}

export function LocationStep({ data, updateData }: LocationStepProps) {
  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Restaurant Address
          </CardTitle>
          <CardDescription>
            Physical location where customers will visit your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street" className="text-sm font-medium">
              Street Address *
            </Label>
            <Input
              id="street"
              placeholder="123 Main Street"
              value={data.address.street}
              onChange={(e) => updateData({ 
                address: { ...data.address, street: e.target.value }
              })}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">Full street address including building number</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium">
                City *
              </Label>
              <Input
                id="city"
                placeholder="New York"
                value={data.address.city}
                onChange={(e) => updateData({ 
                  address: { ...data.address, city: e.target.value }
                })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium">
                State *
              </Label>
              <Input
                id="state"
                placeholder="NY"
                value={data.address.state}
                onChange={(e) => updateData({ 
                  address: { ...data.address, state: e.target.value }
                })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-sm font-medium">
                ZIP Code *
              </Label>
              <Input
                id="zipCode"
                placeholder="10001"
                value={data.address.zipCode}
                onChange={(e) => updateData({ 
                  address: { ...data.address, zipCode: e.target.value }
                })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium">
                Country *
              </Label>
              <Select
                value={data.address.country}
                onValueChange={(value) => updateData({ 
                  address: { ...data.address, country: value }
                })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}