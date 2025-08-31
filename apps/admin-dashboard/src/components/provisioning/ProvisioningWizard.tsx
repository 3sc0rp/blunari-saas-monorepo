import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { BasicInformationStep } from './steps/BasicInformationStep'
import { ContactInformationStep } from './steps/ContactInformationStep'
import { LocationStep } from './steps/LocationStep'
import { OwnerAccountStep } from './steps/OwnerAccountStep'
import { BusinessConfigurationStep } from './steps/BusinessConfigurationStep'
import { PlanSelectionStep } from './steps/PlanSelectionStep'
import { ProvisioningSummary } from './ProvisioningSummary'
import { supabase } from '@/integrations/supabase/client'
import { useSlugValidation } from '@/hooks/useSlugValidation'

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
  { id: 1, title: 'Restaurant Info', description: 'Name and cuisine type' },
  { id: 2, title: 'Contact Details', description: 'Email, phone, and website' },
  { id: 3, title: 'Address', description: 'Location details' },
  { id: 4, title: 'Admin Account', description: 'Owner credentials' },
  { id: 5, title: 'Business Hours', description: 'Operating schedule' },
  { id: 6, title: 'Subscription', description: 'Choose your plan' },
]

interface ProvisioningWizardProps {
  onComplete: (data: ProvisioningData) => void
  onCancel: () => void
}

export function ProvisioningWizard({ onComplete, onCancel }: ProvisioningWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const { toast } = useToast()
  const { generateUniqueSlug, isValidating } = useSlugValidation()

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

  // Auto-generate unique slug from restaurant name
  useEffect(() => {
     const generateSlug = async () => {
      if (data.restaurantName && (!data.slug || data.slug === '')) {
        console.log('Generating slug for:', data.restaurantName)
        try {
          const uniqueSlug = await generateUniqueSlug(data.restaurantName)
          console.log('Generated unique slug:', uniqueSlug)
          setData(prev => ({ ...prev, slug: uniqueSlug }))
        } catch (error) {
          console.error('Error generating slug:', error)
          // Fallback to simple slug generation
          let fallbackSlug = data.restaurantName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .trim()
          
          if (fallbackSlug.length < 3) {
            fallbackSlug = fallbackSlug + '-restaurant'
          }
          
          setData(prev => ({ ...prev, slug: fallbackSlug }))
        }
      }
    }
    
    if (data.restaurantName && !isValidating) {
      generateSlug()
    }
  }, [data.restaurantName, generateUniqueSlug, isValidating])

  const updateData = (updates: Partial<ProvisioningData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Basic Information
        return !!(data.restaurantName?.trim() && data.cuisineTypeId)
      case 2: // Contact Information
        return !!(data.email?.trim() && isValidEmail(data.email))
      case 3: // Location
        return !!(data.address.street?.trim() && data.address.city?.trim() && 
                 data.address.state?.trim() && data.address.zipCode?.trim() && 
                 data.address.country)
      case 4: // Owner Account
        return !!(data.ownerFirstName?.trim() && data.ownerLastName?.trim() && 
                 data.ownerEmail?.trim() && isValidEmail(data.ownerEmail) && 
                 data.ownerPassword?.length >= 8)
      case 5: // Business Configuration
        return true // No required fields, can proceed
      case 6: // Plan Selection
        return !!data.selectedPlanId
      default:
        return false
    }
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      const stepName = STEPS[currentStep - 1]?.title || 'step'
      toast({
        title: "Missing Information",
        description: `Please complete all required fields in ${stepName} before continuing.`,
        variant: "destructive"
      })
      return
    }

    // Additional validation for specific steps
    if (currentStep === 2 && !isValidEmail(data.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      })
      return
    }

    if (currentStep === 4 && !isValidEmail(data.ownerEmail)) {
      toast({
        title: "Invalid Admin Email",
        description: "Please enter a valid admin email address.",
        variant: "destructive"
      })
      return
    }

    if (currentStep === 4 && data.ownerPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      })
      return
    }

    if (isAnimating) return

    setCompletedSteps(prev => new Set([...prev, currentStep]))

    if (currentStep < STEPS.length) {
      setIsAnimating(true)
      
      // Small delay for smooth transition
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setIsAnimating(false)
      }, 150)
    } else {
      await handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1 && !isAnimating) {
      setIsAnimating(true)
      
      setTimeout(() => {
        setCurrentStep(currentStep - 1)
        setIsAnimating(false)
      }, 150)
    }
  }

  const handleComplete = async () => {
    try {
      setIsProcessing(true)
      
      // Final validation before submission
      if (!data.restaurantName.trim()) {
        throw new Error("Restaurant name is required")
      }
      
      if (!data.slug.trim()) {
        throw new Error("Restaurant slug is missing")
      }
      
      if (!isValidEmail(data.email)) {
        throw new Error("Valid business email is required")
      }
      
      if (!isValidEmail(data.ownerEmail)) {
        throw new Error("Valid admin email is required")
      }
      
      if (data.ownerPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long")
      }
      
      await onComplete(data)
      
      toast({
        title: "Success!",
        description: "Your restaurant has been successfully provisioned!",
      })
    } catch (error) {
      console.error('Provisioning error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      
      toast({
        title: "Setup Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const renderStep = () => {
    const stepContent = (() => {
      switch (currentStep) {
        case 1:
          return <BasicInformationStep data={data} updateData={updateData} />
        case 2:
          return <ContactInformationStep data={data} updateData={updateData} />
        case 3:
          return <LocationStep data={data} updateData={updateData} />
        case 4:
          return <OwnerAccountStep data={data} updateData={updateData} />
        case 5:
          return <BusinessConfigurationStep data={data} updateData={updateData} />
        case 6:
          return <PlanSelectionStep data={data} updateData={updateData} />
        default:
          return null
      }
    })()

    return (
      <div 
        key={currentStep}
        className={`
          transition-all duration-300 ease-out
          ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
          animate-fade-in
        `}
      >
        {stepContent}
      </div>
    )
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div 
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 0.8, 
              delay: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 15
            }}
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          <motion.h1 
            className="text-3xl font-bold tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Restaurant Setup Wizard
          </motion.h1>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Let's get your restaurant online in just a few steps
          </motion.p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="mb-8 border-0 shadow-md bg-gradient-to-r from-background to-background/95">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
              </div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={{ originX: 0 }}
              >
                <Progress value={progress} className="mb-4 h-2" />
              </motion.div>
              
              {/* Step Indicators */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {STEPS.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      transition: { delay: 0.4 + index * 0.1, duration: 0.3 }
                    }}
                    className={`flex items-center gap-2 rounded-lg p-3 text-xs transition-all duration-300 ${
                      step.id === currentStep
                        ? 'bg-primary/10 text-primary shadow-sm scale-105'
                        : completedSteps.has(step.id)
                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <motion.div
                      animate={completedSteps.has(step.id) ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {completedSteps.has(step.id) ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <div className={`h-4 w-4 rounded-full transition-all duration-300 ${
                          step.id === currentStep ? 'bg-primary shadow-md' : 'bg-muted'
                        }`} />
                      )}
                    </motion.div>
                    <div className="hidden sm:block">
                      <div className="font-medium">{step.title}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50, scale: 0.98 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              scale: 1,
              transition: {
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
                when: "beforeChildren",
                staggerChildren: 0.1
              }
            }}
            exit={{ 
              opacity: 0, 
              x: -50, 
              scale: 0.98,
              transition: { duration: 0.2 }
            }}
          >
            <Card className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-background to-background/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: 0.1, duration: 0.3 }
                }}
              >
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {STEPS[currentStep - 1]?.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {STEPS[currentStep - 1]?.description}
                  </CardDescription>
                </CardHeader>
              </motion.div>
              <CardContent className="p-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { delay: 0.2, duration: 0.4 }
                  }}
                >
                  {renderStep()}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div 
          className="mt-8 flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            transition: { delay: 0.5, duration: 0.3 }
          }}
        >
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onCancel : handleBack}
            disabled={isProcessing}
            className="transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button 
            onClick={handleNext}
            disabled={isProcessing || !validateStep(currentStep)}
            className={`min-w-32 transition-all duration-200 hover:scale-105 hover:shadow-md ${
              currentStep === STEPS.length 
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
                : ''
            }`}
          >
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              />
            ) : null}
            {isProcessing ? (
              'Processing...'
            ) : currentStep === STEPS.length ? (
              <>
                Complete Setup
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="ml-2"
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              </>
            ) : (
              <>
                Next
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="ml-2"
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
              </>
            )}
          </Button>
        </motion.div>

        {/* Summary Panel */}
        {currentStep > 1 && (
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: 1, 
              height: "auto",
              transition: { delay: 0.6, duration: 0.4 }
            }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ProvisioningSummary data={data} currentStep={currentStep} />
          </motion.div>
        )}
      </div>
    </div>
  )
}