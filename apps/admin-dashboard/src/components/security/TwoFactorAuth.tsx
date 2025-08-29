import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  QrCode, 
  Key, 
  Copy, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TwoFactorAuth as SecurityTwoFactorAuth } from '@/lib/security';

interface TwoFactorAuthProps {
  isEnabled: boolean;
  backupCodes: string[];
  onToggle2FA: (enabled: boolean) => void;
  onRegenerateBackupCodes: (codes: string[]) => void;
}

export function TwoFactorAuth({ 
  isEnabled, 
  backupCodes, 
  onToggle2FA, 
  onRegenerateBackupCodes 
}: TwoFactorAuthProps) {
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeSecret, setQrCodeSecret] = useState<string | null>(null);
  const [qrCodeURL, setQrCodeURL] = useState<string | null>(null);
  const [tempBackupCodes, setTempBackupCodes] = useState<string[]>([]);
  const { toast } = useToast();

  const handleStartSetup = () => {
    const secret = SecurityTwoFactorAuth.generateSecret();
    const qrURL = SecurityTwoFactorAuth.generateQRCodeURL(
      secret, 
      'admin@example.com', // This should come from user context
      'Blunari Admin Dashboard'
    );
    
    setQrCodeSecret(secret);
    setQrCodeURL(qrURL);
    setSetupStep(1);
    setShowSetupDialog(true);
  };

  const handleVerifySetup = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate backup codes
      const codes = SecurityTwoFactorAuth.generateBackupCodes();
      setTempBackupCodes(codes);
      setSetupStep(2);

      toast({
        title: "Verification Successful",
        description: "Your authenticator app has been configured successfully.",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onToggle2FA(true);
      onRegenerateBackupCodes(tempBackupCodes);
      
      setShowSetupDialog(false);
      setSetupStep(1);
      setVerificationCode('');
      setQrCodeSecret(null);
      setQrCodeURL(null);
      setTempBackupCodes([]);

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onToggle2FA(false);
      setShowDisableDialog(false);

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
    } catch (error) {
      toast({
        title: "Disable Failed",
        description: "Failed to disable two-factor authentication.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCodes = SecurityTwoFactorAuth.generateBackupCodes();
      onRegenerateBackupCodes(newCodes);

      toast({
        title: "Backup Codes Regenerated",
        description: "New backup codes have been generated. The old codes are no longer valid.",
      });
    } catch (error) {
      toast({
        title: "Regeneration Failed",
        description: "Failed to generate new backup codes.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n');
    navigator.clipboard.writeText(codesText);
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard.",
    });
  };

  const handleDownloadBackupCodes = () => {
    const codesText = [
      'Blunari Admin Dashboard - Backup Codes',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Keep these codes safe and secure. Each code can only be used once.',
      '',
      ...backupCodes.map((code, index) => `${index + 1}. ${code}`)
    ].join('\n');

    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blunari-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Backup codes downloaded as text file.",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isEnabled ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-900/20'}`}>
                <Shield className={`h-5 w-5 ${isEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <h4 className="font-medium">Authenticator App</h4>
                <p className="text-sm text-muted-foreground">
                  Use an authenticator app to generate verification codes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isEnabled && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              )}
              <Button
                variant={isEnabled ? "outline" : "default"}
                onClick={isEnabled ? () => setShowDisableDialog(true) : handleStartSetup}
              >
                {isEnabled ? 'Disable' : 'Enable'} 2FA
              </Button>
            </div>
          </div>

          {isEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Backup Codes</CardTitle>
                <CardDescription>
                  Use these codes to access your account if you lose your authenticator device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Store these backup codes securely. Each code can only be used once.
                    You have {backupCodes.length} unused backup codes remaining.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2 p-4 bg-muted/50 rounded-lg font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                      <span>{index + 1}.</span>
                      <span className="tracking-wider">{code}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyBackupCodes}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Codes
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadBackupCodes}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRegenerateBackupCodes}
                    disabled={isProcessing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Follow these steps to set up two-factor authentication
            </DialogDescription>
          </DialogHeader>

          <Tabs value={`step-${setupStep}`} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="step-1" disabled={setupStep < 1}>
                1. Scan QR Code
              </TabsTrigger>
              <TabsTrigger value="step-2" disabled={setupStep < 2}>
                2. Backup Codes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="step-1" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="p-4 bg-white rounded-lg inline-block">
                  {qrCodeURL ? (
                    <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                      <QrCode className="h-24 w-24 text-gray-400" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                      <QrCode className="h-24 w-24 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  
                  <div className="space-y-2">
                    <Label>Or enter this secret manually:</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={qrCodeSecret || ''} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (qrCodeSecret) {
                            navigator.clipboard.writeText(qrCodeSecret);
                            toast({ title: "Copied", description: "Secret copied to clipboard." });
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verification-code">Enter verification code from your app:</Label>
                  <Input
                    id="verification-code"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-lg tracking-widest font-mono"
                    maxLength={6}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSetupDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleVerifySetup}
                  disabled={verificationCode.length !== 6 || isProcessing}
                >
                  {isProcessing ? 'Verifying...' : 'Verify & Continue'}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="step-2" className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <strong>Save Your Backup Codes</strong><br/>
                  These codes will allow you to access your account if you lose your authenticator device.
                  Store them in a safe place and don't share them with anyone.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted/50 rounded-lg font-mono text-sm">
                {tempBackupCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                    <span>{index + 1}.</span>
                    <span className="tracking-wider">{code}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const codesText = tempBackupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n');
                    navigator.clipboard.writeText(codesText);
                    toast({ title: "Copied", description: "Backup codes copied to clipboard." });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Codes
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const codesText = tempBackupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n');
                    const blob = new Blob([codesText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: "Downloaded", description: "Backup codes downloaded." });
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <DialogFooter>
                <Button 
                  onClick={handleCompleteSetup}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? 'Enabling...' : 'Complete Setup'}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable two-factor authentication? 
              This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Disabling 2FA will remove the extra layer of security from your account.
              Your backup codes will also become invalid.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDisableDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={isProcessing}
            >
              {isProcessing ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}