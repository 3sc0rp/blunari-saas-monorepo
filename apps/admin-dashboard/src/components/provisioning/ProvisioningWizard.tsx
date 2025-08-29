import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { BasicInformationStep } from './steps/BasicInformationStep'
import { OwnerAccountStep } from './steps/OwnerAccountStep'
import { BusinessConfigurationStep } from './steps/BusinessConfigurationStep'
import { BillingSetupStep } from './steps/BillingSetupStep'
import { FeatureConfigurationStep } from './steps/FeatureConfigurationStep'
import { ProvisioningSummary } from './ProvisioningSummary'
import { supabase } from '@/integrations/supabase/client'

export interface ProvisioningData {
  // Basic Information
  restaurantName: string
  slug: string
  description: string
  phone: string
  email: string
  website: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  cuisineTypeId: string
  logoUrl?: string
  coverImageUrl?: string

  // Owner Account
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerPassword: string

  // Business Configuration
  timezone: string
  businessHours: Array<{
    dayOfWeek: number
    isOpen: boolean
    openTime?: string
    closeTime?: string
  }>
  partySizeConfig: {
    minPartySize: number
    maxPartySize: number
    defaultPartySize: number
    allowLargeParties: boolean
    largePartyThreshold: number
  }

  // Billing Setup
  selectedPlanId: string
  billingCycle: 'monthly' | 'yearly'
  
  // Feature Configuration
  enabledFeatures: {
    deposits: boolean
    posIntegration: boolean
    etaNotifications: boolean
    customBranding: boolean
    advancedAnalytics: boolean
    multiLocation: boolean
  }
}

const STEPS = [
  { id: 1, title: 'Basic Information', description: 'Restaurant details and contact' },
  { id: 2, title: 'Owner Account', description: 'Create your admin account' },
  { id: 3, title: 'Business Configuration', description: 'Hours, timezone, and settings' },
  { id: 4, title: 'Billing Setup', description: 'Choose your plan and billing' },
  { id: 5, title: 'Feature Configuration', description: 'Enable advanced features' },
]

interface ProvisioningWizardProps {
  onComplete: (data: ProvisioningData) => void
  onCancel: () => void
}

export function ProvisioningWizard({ onComplete, onCancel }: ProvisioningWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const { toast } = useToast()

  const [data, setData] = useState<ProvisioningData>({
    restaurantName: '',
    slug: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    cuisineTypeId: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
    timezone: 'America/New_York',
    businessHours: [
      { dayOfWeek: 0, isOpen: false }, // Sunday
      { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '22:00' }, // Monday
      { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '22:00' }, // Tuesday
      { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '22:00' }, // Wednesday
      { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '22:00' }, // Thursday
      { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '23:00' }, // Friday
      { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '23:00' }, // Saturday
    ],
    partySizeConfig: {
      minPartySize: 1,
      maxPartySize: 12,
      defaultPartySize: 2,
      allowLargeParties: true,
      largePartyThreshold: 8
    },
    selectedPlanId: '',
    billingCycle: 'monthly',
    enabledFeatures: {
      deposits: false,
      posIntegration: false,
      etaNotifications: false,
      customBranding: false,
      advancedAnalytics: false,
      multiLocation: false
    }
  })

  // Auto-generate slug from restaurant name
  useEffect(() => {
    if (data.restaurantName && !data.slug) {
      const generatedSlug = data.restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setData(prev => ({ ...prev, slug: generatedSlug }))
    }
  }, [data.restaurantName, data.slug])

  const updateData = (updates: Partial<ProvisioningData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(data.restaurantName && data.slug && data.email && data.phone && data.cuisineTypeId)
      case 2:
        return !!(data.ownerFirstName && data.ownerLastName && data.ownerEmail && data.ownerPassword)
      case 3:
        return data.businessHours.some(h => h.isOpen)
      case 4:
        return !!data.selectedPlanId
      case 5:
        return true // Feature configuration is optional
      default:
        return false
    }
  }

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before continuing.",
        variant: "destructive"
      })
      return
    }

    setCompletedSteps(prev => new Set([...prev, currentStep]))

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    } else {
      await handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      setIsProcessing(true)
      await onComplete(data)
      
      toast({
        title: "Success!",
        description: "Your restaurant has been successfully provisioned!",
      })
    } catch (error) {
      console.error('Provisioning error:', error)
      toast({
        title: "Error",
        description: "Failed to complete provisioning. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInformationStep data={data} updateData={updateData} />
      case 2:
        return <OwnerAccountStep data={data} updateData={updateData} />
      case 3:
        return <BusinessConfigurationStep data={data} updateData={updateData} />
      case 4:
        return <BillingSetupStep data={data} updateData={updateData} />
      case 5:
        return <FeatureConfigurationStep data={data} updateData={updateData} />
      default:
        return null
    }
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary/80">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Restaurant Setup Wizard</h1>
          <p className="text-muted-foreground">Let's get your restaurant online in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="mb-4" />
            
            {/* Step Indicators */}
            <div className="grid grid-cols-5 gap-2">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 rounded-lg p-2 text-xs transition-colors ${
                    step.id === currentStep
                      ? 'bg-primary/10 text-primary'
                      : completedSteps.has(step.id)
                      ? 'bg-green-50 text-green-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {completedSteps.has(step.id) ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className={`h-4 w-4 rounded-full ${
                      step.id === currentStep ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                  <div className="hidden sm:block">
                    <div className="font-medium">{step.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{STEPS[currentStep - 1]?.title}</CardTitle>
                <CardDescription>{STEPS[currentStep - 1]?.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStep()}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onCancel : handleBack}
            disabled={isProcessing}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button 
            onClick={handleNext}
            disabled={isProcessing || !validateStep(currentStep)}
            className="min-w-32"
          >
            {isProcessing ? (
              'Processing...'
            ) : currentStep === STEPS.length ? (
              'Complete Setup'
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Summary Panel */}
        {currentStep > 1 && (
          <div className="mt-8">
            <ProvisioningSummary data={data} currentStep={currentStep} />
          </div>
        )}
      </div>
    </div>
  )
}