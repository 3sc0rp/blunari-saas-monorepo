import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Mail, Lock, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProvisioningData } from '../ProvisioningWizard'

interface OwnerAccountStepProps {
  data: ProvisioningData
  updateData: (updates: Partial<ProvisioningData>) => void
}

export function OwnerAccountStep({ data, updateData }: OwnerAccountStepProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const checkPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const handlePasswordChange = (password: string) => {
    updateData({ ownerPassword: password })
    setPasswordStrength(checkPasswordStrength(password))
  }

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    handlePasswordChange(password)
  }

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'bg-red-500'
      case 2: return 'bg-orange-500'
      case 3: return 'bg-yellow-500'
      case 4: return 'bg-green-500'
      case 5: return 'bg-emerald-500'
      default: return 'bg-gray-300'
    }
  }

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'Very Weak'
      case 2: return 'Weak'
      case 3: return 'Fair'
      case 4: return 'Good'
      case 5: return 'Excellent'
      default: return 'No password'
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          This account will have full administrative access to your restaurant's booking system. 
          Choose a strong password and keep your credentials secure.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Administrator Account
          </CardTitle>
          <CardDescription>
            Create your main administrative account for managing the restaurant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownerFirstName">First Name *</Label>
              <Input
                id="ownerFirstName"
                placeholder="John"
                value={data.ownerFirstName}
                onChange={(e) => updateData({ ownerFirstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerLastName">Last Name *</Label>
              <Input
                id="ownerLastName"
                placeholder="Doe"
                value={data.ownerLastName}
                onChange={(e) => updateData({ ownerLastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Admin Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="ownerEmail"
                type="email"
                placeholder="admin@restaurant.com"
                value={data.ownerEmail}
                onChange={(e) => updateData({ ownerEmail: e.target.value })}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This email will be used for login and important system notifications
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerPassword">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="ownerPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter a strong password"
                value={data.ownerPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="pl-10 pr-20"
              />
              <div className="absolute right-3 top-3 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {data.ownerPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Password Strength:</span>
                  <span className="font-medium">{getPasswordStrengthText()}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateStrongPassword}
                className="text-xs"
              >
                Generate Strong Password
              </Button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Password requirements:</p>
              <div className="grid grid-cols-1 gap-1">
                <div className="flex items-center gap-2">
                  {data.ownerPassword.length >= 8 ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  <span>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  {/[A-Z]/.test(data.ownerPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  <span>One uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  {/[a-z]/.test(data.ownerPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  <span>One lowercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  {/[0-9]/.test(data.ownerPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  <span>One number</span>
                </div>
                <div className="flex items-center gap-2">
                  {/[^A-Za-z0-9]/.test(data.ownerPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  <span>One special character</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-green-800">Security Best Practices</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Keep your password confidential and don't share it with others</li>
                <li>• Consider using two-factor authentication once your account is set up</li>
                <li>• You can always change your password after initial setup</li>
                <li>• Regular password updates enhance security</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}