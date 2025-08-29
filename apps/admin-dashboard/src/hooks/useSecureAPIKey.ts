import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface APIKeyData {
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: string;
}

interface GeneratedAPIKey {
  id: string;
  key: string;
  keyPreview: string;
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: string;
  createdAt: string;
}

export function useSecureAPIKey() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSecureAPIKey = async (data: APIKeyData): Promise<GeneratedAPIKey | null> => {
    setIsGenerating(true);
    try {
      // Call edge function to securely generate API key
      const { data: result, error } = await supabase.functions.invoke('generate-api-key', {
        body: {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
          expiresAt: data.expiresAt
        }
      });

      if (error) {
        console.error('API Key generation error:', error);
        throw new Error(error.message || 'Failed to generate API key');
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to generate API key');
      }

      // Log the API key creation
      await supabase.rpc('log_security_event', {
        p_event_type: 'api_key_created',
        p_severity: 'medium',
        p_event_data: {
          api_key_name: data.name,
          permissions: data.permissions,
          expires_at: data.expiresAt
        }
      });

      toast({
        title: "API Key Generated",
        description: "Your secure API key has been generated successfully.",
      });

      return result.apiKey;
    } catch (error) {
      console.error('Secure API key generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate API key",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeAPIKey = async (keyId: string): Promise<boolean> => {
    try {
      const { data: result, error } = await supabase.functions.invoke('revoke-api-key', {
        body: { keyId }
      });

      if (error) throw error;

      if (result?.success) {
        // Log the API key revocation
        await supabase.rpc('log_security_event', {
          p_event_type: 'api_key_revoked',
          p_severity: 'medium',
          p_event_data: { api_key_id: keyId }
        });

        toast({
          title: "API Key Revoked",
          description: "The API key has been successfully revoked.",
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('API key revocation failed:', error);
      toast({
        title: "Revocation Failed",
        description: "Failed to revoke API key. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const validateAPIKeyPermissions = async (keyHash: string, requiredPermission: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_api_key_permissions', {
        p_key_hash: keyHash,
        p_required_permission: requiredPermission
      });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  };

  return {
    generateSecureAPIKey,
    revokeAPIKey,
    validateAPIKeyPermissions,
    isGenerating
  };
}