import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, Globe, Phone, Mail, MapPin } from 'lucide-react'
import type { ProvisioningData } from '../ProvisioningWizard'
import { supabase } from '@/integrations/supabase/client'

interface CuisineType {
  id: string
  name: string
  description: string
  icon: string
}

interface BasicInformationStepProps {
  data: ProvisioningData
  updateData: (updates: Partial<ProvisioningData>) => void
}

export function BasicInformationStep({ data, updateData }: BasicInformationStepProps) {
  const [cuisineTypes, setCuisineTypes] = useState<CuisineType[]>([])
  const [isLoadingCuisines, setIsLoadingCuisines] = useState(true)

  useEffect(() => {
    const fetchCuisineTypes = async () => {
      try {
        const { data: cuisines, error } = await supabase
          .from('cuisine_types')
          .select('*')
          .order('name')

        if (error) throw error
        setCuisineTypes(cuisines || [])
      } catch (error) {
        console.error('Error fetching cuisine types:', error)
      } finally {
        setIsLoadingCuisines(false)
      }
    }

    fetchCuisineTypes()
  }, [])

  return (
    <div className="space-y-6">
      {/* Restaurant Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Restaurant Identity
          </CardTitle>
          <CardDescription>
            This information will be displayed to your customers and used across the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Restaurant Name *</Label>
              <Input
                id="restaurantName"
                placeholder="e.g., Bella Vista Italian"
                value={data.restaurantName}
                onChange={(e) => updateData({ restaurantName: e.target.value })}
                className="font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                  bookings.app/
                </span>
                <Input
                  id="slug"
                  placeholder="bella-vista"
                  value={data.slug}
                  onChange={(e) => updateData({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="rounded-l-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell customers about your restaurant..."
              value={data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuisineType">Cuisine Type *</Label>
            <Select
              value={data.cuisineTypeId}
              onValueChange={(value) => updateData({ cuisineTypeId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your cuisine type" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCuisines ? (
                  <SelectItem value="loading" disabled>Loading cuisine types...</SelectItem>
                ) : (
                  cuisineTypes.map((cuisine) => (
                    <SelectItem key={cuisine.id} value={cuisine.id}>
                      <div className="flex items-center gap-2">
                        <span>{cuisine.icon}</span>
                        <span>{cuisine.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            How customers can reach your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={data.phone}
                  onChange={(e) => updateData({ phone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@restaurant.com"
                  value={data.email}
                  onChange={(e) => updateData({ email: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (Optional)</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                type="url"
                placeholder="https://www.restaurant.com"
                value={data.website}
                onChange={(e) => updateData({ website: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Restaurant Address
          </CardTitle>
          <CardDescription>
            Your restaurant's physical location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              placeholder="123 Main Street"
              value={data.address.street}
              onChange={(e) => updateData({ 
                address: { ...data.address, street: e.target.value }
              })}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="New York"
                value={data.address.city}
                onChange={(e) => updateData({ 
                  address: { ...data.address, city: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="NY"
                value={data.address.state}
                onChange={(e) => updateData({ 
                  address: { ...data.address, state: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                placeholder="10001"
                value={data.address.zipCode}
                onChange={(e) => updateData({ 
                  address: { ...data.address, zipCode: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={data.address.country}
                onValueChange={(value) => updateData({ 
                  address: { ...data.address, country: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
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