/**
 * Skeleton Loading Components for Catering Widget
 * 
 * Content-aware skeleton screens that match the structure of actual components,
 * providing better perceived performance than generic spinners.
 */

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// Package Card Skeleton
// ============================================================================

export const PackageCardSkeleton: React.FC = () => (
  <Card className="h-full overflow-hidden">
    {/* Image skeleton */}
    <Skeleton className="h-48 w-full rounded-t-lg" />
    
    <CardHeader>
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-32 opacity-70" />
      </div>
    </CardHeader>
    
    <CardContent className="space-y-4">
      {/* Description lines */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      
      {/* Guest count */}
      <Skeleton className="h-5 w-32" />
      
      {/* Included services */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
      
      {/* Dietary tags */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      
      {/* Button */}
      <Skeleton className="h-11 w-full rounded-md" />
    </CardContent>
  </Card>
);

// ============================================================================
// Package Grid Skeleton
// ============================================================================

export const PackageGridSkeleton: React.FC = () => (
  <div className="w-full">
    {/* Header skeleton */}
    <div className="text-center mb-8">
      <Skeleton className="h-9 w-96 mx-auto mb-3" />
      <Skeleton className="h-6 w-80 mx-auto" />
    </div>
    
    {/* Grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <PackageCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ============================================================================
// Form Skeleton
// ============================================================================

export const FormSkeleton: React.FC = () => (
  <div className="w-full max-w-3xl mx-auto">
    {/* Header skeleton */}
    <div className="text-center mb-8">
      <Skeleton className="h-9 w-80 mx-auto mb-3" />
      <Skeleton className="h-6 w-96 mx-auto" />
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main form skeleton */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
        
        {/* Navigation buttons skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 flex-1" />
        </div>
      </div>
      
      {/* Sidebar skeleton */}
      <div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

// ============================================================================
// Header Skeleton
// ============================================================================

export const HeaderSkeleton: React.FC = () => (
  <div className="bg-white border-b shadow-sm">
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  </div>
);

// ============================================================================
// Progress Steps Skeleton
// ============================================================================

export const ProgressStepsSkeleton: React.FC = () => (
  <div className="mb-8 flex items-center justify-between max-w-2xl mx-auto">
    {[1, 2, 3, 4].map((i, idx) => (
      <React.Fragment key={i}>
        <Skeleton className="h-10 w-24 rounded-full" />
        {idx < 3 && <Skeleton className="w-8 h-0.5 mx-2" />}
      </React.Fragment>
    ))}
  </div>
);

// ============================================================================
// Confirmation Skeleton
// ============================================================================

export const ConfirmationSkeleton: React.FC = () => (
  <div className="w-full max-w-3xl mx-auto">
    <Card>
      <CardHeader className="text-center space-y-4 pb-8">
        <Skeleton className="w-16 h-16 rounded-full mx-auto" />
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-5 w-96 mx-auto" />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-48" />
              </div>
            ))}
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================================================
// Full Page Loading Skeleton
// ============================================================================

export const CateringWidgetSkeleton: React.FC<{ step?: 'packages' | 'customize' | 'details' | 'confirmation' }> = ({ 
  step = 'packages' 
}) => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
    <HeaderSkeleton />
    
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <ProgressStepsSkeleton />
        
        {step === 'packages' && <PackageGridSkeleton />}
        {step === 'customize' && <FormSkeleton />}
        {step === 'details' && <FormSkeleton />}
        {step === 'confirmation' && <ConfirmationSkeleton />}
      </div>
    </div>
  </div>
);

// ============================================================================
// Export
// ============================================================================

export default {
  PackageCard: PackageCardSkeleton,
  PackageGrid: PackageGridSkeleton,
  Form: FormSkeleton,
  Header: HeaderSkeleton,
  ProgressSteps: ProgressStepsSkeleton,
  Confirmation: ConfirmationSkeleton,
  FullPage: CateringWidgetSkeleton,
};
