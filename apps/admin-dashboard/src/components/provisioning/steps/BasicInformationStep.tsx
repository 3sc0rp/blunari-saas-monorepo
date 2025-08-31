import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Store } from 'lucide-react'
import type { ProvisioningData } from '../ProvisioningWizard'
import { supabase } from '@/integrations/supabase/client'

interface CuisineType {
  id: string
  name: string
  icon: string
}

interface BasicInformationStepProps {
  data: ProvisioningData
  updateData: (updates: Partial<ProvisioningData>) => void
}

export function BasicInformationStep({ data, updateData }: BasicInformationStepProps) {
  const [cuisineTypes, setCuisineTypes] = useState<CuisineType[]>([])

  useEffect(() => {
    const fetchCuisineTypes = async () => {
      const { data: cuisines } = await supabase
        .from('cuisine_types')
        .select('*')
        .order('name')
      setCuisineTypes(cuisines || [])
    }
    fetchCuisineTypes()
  }, [])

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Restaurant Details
          </CardTitle>
          <CardDescription>
            Core information that will appear on your client dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="restaurantName" className="text-sm font-medium">
                Restaurant Name *
              </Label>
              <Input
                id="restaurantName"
                placeholder="e.g., Bella Vista Ristorante"
                value={data.restaurantName}
                onChange={(e) => updateData({ restaurantName: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">This will be your business display name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuisineType" className="text-sm font-medium">
                Cuisine Type *
              </Label>
              <Select
                value={data.cuisineTypeId}
                onValueChange={(value) => updateData({ cuisineTypeId: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select your cuisine style" />
                </SelectTrigger>
                <SelectContent>
                  {cuisineTypes.map((cuisine) => (
                    <SelectItem key={cuisine.id} value={cuisine.id}>
                      <div className="flex items-center gap-2">
                        <span>{cuisine.icon}</span>
                        <span>{cuisine.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Business Description
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of your restaurant, ambiance, and specialties..."
              value={data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground">Optional: Help customers understand your unique offering</p>
          </div>
        </CardContent>
      </Card>

      {data.slug && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Your restaurant slug:</strong> <code className="bg-background px-2 py-1 rounded text-foreground">{data.slug}</code>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This unique identifier will be used for your restaurant's booking URLs and API endpoints
          </p>
        </div>
      )}
    </div>
  )
}