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
      const { error } = await supabase.functions.invoke("health-check-api", { body: {} });
      if (error) throw error;
      toast({ title: "Test queued", description: "Check Background Ops logs for delivery." });
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
      </CardContent>
    </Card>
  );
};

export default GlobalCommunications;


