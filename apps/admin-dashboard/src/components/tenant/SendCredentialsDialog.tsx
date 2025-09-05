import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Key, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  defaultEmail?: string | null;
  onSent?: () => void;
}

export function SendCredentialsDialog({
  open,
  onOpenChange,
  tenantName,
  defaultEmail,
  onSent,
}: Props) {
  const { toast } = useToast();
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setOwnerName("Owner");
      setOwnerEmail(defaultEmail || "");
      setOwnerPassword("");
    }
  }, [open, defaultEmail]);

  const loginUrl =
    (import.meta as any)?.env?.VITE_CLIENT_BASE_URL || "https://app.blunari.ai";

  const onSend = async () => {
    if (!ownerName || !ownerEmail || !ownerPassword) {
      toast({
        title: "Missing info",
        description: "Please enter owner name, email, and password",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-credentials-email",
        {
          body: {
            ownerName,
            ownerEmail,
            ownerPassword,
            restaurantName: tenantName,
            loginUrl,
          },
        },
      );

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to send");
      }

  toast({
        title: "Credentials Sent",
        description: `Login details sent to ${ownerEmail}`,
      });
  onSent?.();
      onOpenChange(false);
    } catch (err) {
      console.error("send-credentials-email error", err);
      toast({
        title: "Failed to send credentials",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Send Credentials Email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Owner name</Label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Owner name"
            />
          </div>
          <div className="space-y-2">
            <Label>Owner email</Label>
            <Input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="owner@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Temporary password</Label>
            <Input
              type="text"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="Enter a temporary password"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSend} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
