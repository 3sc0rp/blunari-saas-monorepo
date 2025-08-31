import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Key, Package, Loader2 } from "lucide-react";

interface EmailOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provisioningData: {
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    restaurantName: string;
    loginUrl: string;
  };
}

export const EmailOptionsDialog: React.FC<EmailOptionsDialogProps> = ({
  isOpen,
  onClose,
  provisioningData,
}) => {
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const { toast } = useToast();

  const sendWelcomePack = async () => {
    console.log('Sending welcome pack email...');
    setSendingWelcome(true);
    try {
      console.log('Invoking send-welcome-pack function with data:', {
        ownerName: provisioningData.ownerName,
        ownerEmail: provisioningData.ownerEmail,
        restaurantName: provisioningData.restaurantName,
        loginUrl: provisioningData.loginUrl
      });

      const { data, error } = await supabase.functions.invoke('send-welcome-pack', {
        body: {
          ownerName: provisioningData.ownerName,
          ownerEmail: provisioningData.ownerEmail,
          restaurantName: provisioningData.restaurantName,
          loginUrl: provisioningData.loginUrl
        }
      });

      console.log('Welcome pack response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Welcome Pack Sent! 🎉",
          description: `Welcome pack email sent to ${provisioningData.ownerEmail}`,
        });
      } else {
        throw new Error(data?.error || "Failed to send welcome pack");
      }
    } catch (error) {
      console.error('Error sending welcome pack:', error);
      toast({
        title: "Failed to Send Welcome Pack",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSendingWelcome(false);
    }
  };

  const sendCredentials = async () => {
    console.log('Sending credentials email...');
    setSendingCredentials(true);
    try {
      console.log('Invoking send-credentials-email function with data:', {
        ownerName: provisioningData.ownerName,
        ownerEmail: provisioningData.ownerEmail,
        ownerPassword: '***HIDDEN***',
        restaurantName: provisioningData.restaurantName,
        loginUrl: provisioningData.loginUrl
      });

      const { data, error } = await supabase.functions.invoke('send-credentials-email', {
        body: {
          ownerName: provisioningData.ownerName,
          ownerEmail: provisioningData.ownerEmail,
          ownerPassword: provisioningData.ownerPassword,
          restaurantName: provisioningData.restaurantName,
          loginUrl: provisioningData.loginUrl
        }
      });

      console.log('Credentials response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Credentials Sent! 🔐",
          description: `Login credentials sent to ${provisioningData.ownerEmail}`,
        });
      } else {
        throw new Error(data?.error || "Failed to send credentials");
      }
    } catch (error) {
      console.error('Error sending credentials:', error);
      toast({
        title: "Failed to Send Credentials",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSendingCredentials(false);
    }
  };

  console.log('EmailOptionsDialog rendering with data:', provisioningData);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Welcome Emails
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Choose which email(s) to send to <strong>{provisioningData.ownerEmail}</strong> for <strong>{provisioningData.restaurantName}</strong>:
          </p>
          
          <div className="grid gap-3">
            <Button
              onClick={sendWelcomePack}
              disabled={sendingWelcome}
              className="flex items-center gap-2 h-auto py-4 px-4"
              variant="outline"
            >
              {sendingWelcome ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Package className="h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-semibold">Welcome Pack</div>
                <div className="text-xs text-muted-foreground">
                  Getting started guide and resources
                </div>
              </div>
            </Button>
            
            <Button
              onClick={sendCredentials}
              disabled={sendingCredentials}
              className="flex items-center gap-2 h-auto py-4 px-4"
              variant="outline"
            >
              {sendingCredentials ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Key className="h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-semibold">Confirmation & Credentials</div>
                <div className="text-xs text-muted-foreground">
                  Login details and account confirmation
                </div>
              </div>
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <Button
              onClick={onClose}
              variant="secondary"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};