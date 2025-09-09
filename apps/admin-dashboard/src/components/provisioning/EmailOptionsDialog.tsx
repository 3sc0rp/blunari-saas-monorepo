import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const { toast } = useToast();

  const sendWelcomeEmail = async (includeCredentials: boolean = false) => {
    console.log("Sending tenant welcome email...", { includeCredentials });
    setSendingWelcome(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-tenant-welcome-email",
        {
          body: {
            ownerName: provisioningData.ownerName,
            ownerEmail: provisioningData.ownerEmail,
            restaurantName: provisioningData.restaurantName,
            loginUrl: provisioningData.loginUrl,
            includeCredentials,
            temporaryPassword: includeCredentials ? provisioningData.ownerPassword : undefined,
          },
        },
      );

      console.log("Welcome email response:", { data, error });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Welcome Email Sent! 🎉",
          description: `Welcome email ${includeCredentials ? 'with credentials ' : ''}sent to ${provisioningData.ownerEmail}`,
        });
        onClose(); // Auto-close dialog after successful send
      } else {
        throw new Error(data?.error || "Failed to send welcome email");
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      toast({
        title: "Failed to Send Welcome Email",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSendingWelcome(false);
    }
  };

  console.log("EmailOptionsDialog rendering with data:", provisioningData);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Welcome Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Send a welcome email to{" "}
            <strong>{provisioningData.ownerEmail}</strong> for{" "}
            <strong>{provisioningData.restaurantName}</strong>:
          </p>

          <div className="grid gap-3">
            <Button
              onClick={() => sendWelcomeEmail(false)}
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
                <div className="font-semibold">Welcome Email Only</div>
                <div className="text-xs text-muted-foreground">
                  Getting started guide without login credentials
                </div>
              </div>
            </Button>

            <Button
              onClick={() => sendWelcomeEmail(true)}
              disabled={sendingWelcome}
              className="flex items-center gap-2 h-auto py-4 px-4"
              variant="default"
            >
              {sendingWelcome ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Key className="h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-semibold">Welcome Email + Credentials</div>
                <div className="text-xs text-muted-foreground">
                  Complete welcome with login details included
                </div>
              </div>
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={onClose} variant="secondary" className="w-full">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
