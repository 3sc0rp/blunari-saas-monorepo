import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ProvisioningWizard, type ProvisioningData } from '@/components/provisioning/ProvisioningWizard'
import { useTenantProvisioning } from '@/hooks/useTenantProvisioning'
import { useToast } from '@/hooks/use-toast'

export default function NewTenantPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { provisionTenant } = useTenantProvisioning()

  const handleProvisioningComplete = async (data: ProvisioningData) => {
    try {
      // Call the background-ops API for tenant provisioning
      const result = await provisionTenant(data)
      
      console.log('Provisioning completed:', result)
      
      // Navigate back to tenants list
      navigate('/admin/tenants')
    } catch (error) {
      console.error('Provisioning error:', error)
      throw error
    }
  }

  const handleCancel = () => {
    navigate('/admin/tenants')
  }

  return (
    <ProvisioningWizard 
      onComplete={handleProvisioningComplete}
      onCancel={handleCancel}
    />
  )
}