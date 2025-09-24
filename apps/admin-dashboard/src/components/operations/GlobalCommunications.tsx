import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type GlobalCommSettings = {
  email: {
    provider: "resend" | "fastmail" | "smtp";
    fromEmail: string;
    resendApiKey?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
  };
  sms: {
    provider: "telnyx" | "twilio";
    telnyxMessagingProfileId?: string;
    telnyxFromNumber?: string;
    twilioFromNumber?: string;
  };
};

const DEFAULTS: GlobalCommSettings = {
  email: { provider: "resend", fromEmail: "noreply@blunari.ai" },
  sms: { provider: "telnyx" },
};

export const GlobalCommunications: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GlobalCommSettings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastDelivery, setLastDelivery] = useState<null | {
    jobId: string;
    status: string;
    messageId?: string;
    type?: string;
    to?: string;
    provider?: string;
    error?: string;
  }>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "global_communications")
        .maybeSingle();
      if (data?.value) setSettings(data.value as GlobalCommSettings);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const save = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("platform_settings").upsert(
        { key: "global_communications", value: settings },
        { onConflict: "key" },
      );
      if (error) throw error;
      toast({ title: "Saved", description: "Global communications updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const testSend = async () => {
    setTesting(true);
    try {
      const emailTo = prompt("Enter an email to send test to") || "";
      if (!emailTo) throw new Error("Recipient email is required");
      const { data, error } = await supabase.functions.invoke("jobs-api", {
        body: {
          action: "create",
          type: "notification.send",
          payload: {
            userId: "admin",
            type: "email",
            to: emailTo,
            template: "booking_confirmation",
            data: {
              tenant_name: "Blunari",
              when: new Date().toLocaleString(),
              party_size: 2,
              confirmation_number: Math.random().toString(36).slice(2, 10).toUpperCase(),
            },
          },
          priority: 1,
        },
      });
      if (error) throw error;
      const jobId = data?.data?.id || data?.id;
      toast({ title: "Test queued", description: `Job ${jobId || "created"}` });

      if (jobId) {
        // Poll job status until completed/failed or timeout
        const start = Date.now();
        let status = "pending";
        while (Date.now() - start < 30000) {
          const { data: jobResp, error: jobErr } = await supabase.functions.invoke("jobs-api", {
            body: { action: "get", id: jobId },
          });
          if (jobErr) break;
          const job = jobResp?.data || jobResp; // normalize
          status = job?.status || status;
          if (status === "completed" || status === "failed") {
            const result = job?.result || {};
            setLastDelivery({
              jobId,
              status,
              messageId: result?.messageId,
              type: result?.type,
              to: result?.to,
              provider: result?.provider,
              error: job?.error,
            });
            toast({
              title: status === "completed" ? "Delivery succeeded" : "Delivery failed",
              description:
                status === "completed"
                  ? `messageId=${result?.messageId || "n/a"} via ${result?.provider || ""}`
                  : job?.error || "Unknown error",
              variant: status === "completed" ? "default" : "destructive",
            });
            break;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Communications (Blunari)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="email">
          <TabsList>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
          </TabsList>
          <TabsContent value="email" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Provider</Label>
                <Input value={settings.email.provider} onChange={(e) => setSettings({ ...settings, email: { ...settings.email, provider: e.target.value as any } })} />
              </div>
              <div>
                <Label>From Email</Label>
                <Input value={settings.email.fromEmail} onChange={(e) => setSettings({ ...settings, email: { ...settings.email, fromEmail: e.target.value } })} />
              </div>
              {settings.email.provider === "resend" && (
                <div className="md:col-span-2">
                  <Label>Resend API Key</Label>
                  <Input type="password" value={settings.email.resendApiKey || ""} onChange={(e) => setSettings({ ...settings, email: { ...settings.email, resendApiKey: e.target.value } })} />
                </div>
              )}
              {(settings.email.provider === "fastmail" || settings.email.provider === "smtp") && (
                <>
                  <div>
                    <Label>SMTP Host</Label>
                    <Input value={settings.email.smtpHost || ""} onChange={(e) => setSettings({ ...settings, email: { ...settings.email, smtpHost: e.target.value } })} />
                  </div>
                  <div>
                    <Label>SMTP Port</Label>
                    <Input type="number" value={settings.email.smtpPort || 0} onChange={(e) => setSettings({ ...settings, email: { ...settings.email, smtpPort: Number(e.target.value || 0) } })} />
                  </div>
                  <div>
                    <Label>SMTP User</Label>
                    <Input value={settings.email.smtpUser || ""} onChange={(e) => setSettings({ ...settings, email: { ...settings.email, smtpUser: e.target.value } })} />
                  </div>
                  <div>
                    <Label>SMTP Pass</Label>
                    <Input type="password" value={settings.email.smtpPass || ""} onChange={(e) => setSettings({ ...settings, email: { ...settings.email, smtpPass: e.target.value } })} />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          <TabsContent value="sms" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Provider</Label>
                <Input value={settings.sms.provider} onChange={(e) => setSettings({ ...settings, sms: { ...settings.sms, provider: e.target.value as any } })} />
              </div>
              <div>
                <Label>Telnyx Messaging Profile ID</Label>
                <Input value={settings.sms.telnyxMessagingProfileId || ""} onChange={(e) => setSettings({ ...settings, sms: { ...settings.sms, telnyxMessagingProfileId: e.target.value } })} />
              </div>
              <div>
                <Label>From Number</Label>
                <Input value={settings.sms.telnyxFromNumber || settings.sms.twilioFromNumber || ""} onChange={(e) => setSettings({ ...settings, sms: { ...settings.sms, telnyxFromNumber: e.target.value, twilioFromNumber: e.target.value } })} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={testSend} disabled={testing}>Test Send</Button>
          <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
        </div>
        {lastDelivery && (
          <div className="text-xs text-muted-foreground mt-2">
            Last delivery: {lastDelivery.status} · Job {lastDelivery.jobId}
            {lastDelivery.messageId ? ` · messageId ${lastDelivery.messageId}` : ""}
            {lastDelivery.provider ? ` · ${lastDelivery.provider}` : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GlobalCommunications;


