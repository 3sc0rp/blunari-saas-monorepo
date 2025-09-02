import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APIKey } from "@/types/profile";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APIKeyManager as SecurityAPIKeyManager } from "@/lib/security";
import { createAPIKeySchema, type CreateAPIKeyData } from "@/lib/validations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface APIKeyManagerProps {
  apiKeys: APIKey[];
  onUpdateAPIKeys: (keys: APIKey[]) => void;
}

const PERMISSION_OPTIONS = [
  {
    value: "read",
    label: "Read Access",
    description: "View data and resources",
  },
  {
    value: "write",
    label: "Write Access",
    description: "Create and update resources",
  },
  { value: "delete", label: "Delete Access", description: "Remove resources" },
  {
    value: "admin",
    label: "Admin Access",
    description: "Full administrative access",
  },
  {
    value: "analytics",
    label: "Analytics Access",
    description: "View analytics and reports",
  },
  {
    value: "export",
    label: "Export Access",
    description: "Export data and generate reports",
  },
];

export function APIKeyManager({
  apiKeys,
  onUpdateAPIKeys,
}: APIKeyManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFullKey, setShowFullKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<CreateAPIKeyData>({
    resolver: zodResolver(createAPIKeySchema),
    defaultValues: {
      permissions: [],
    },
  });

  const selectedPermissions = watch("permissions") || [];

  const handleCreateAPIKey = async (data: CreateAPIKeyData) => {
    setIsCreating(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const apiKey = SecurityAPIKeyManager.generateAPIKey();
      const newAPIKey: APIKey = {
        id: crypto.randomUUID(),
        userId: "current-user-id",
        name: data.name,
        description: data.description || "",
        keyPreview: SecurityAPIKeyManager.maskAPIKey(apiKey),
        permissions: data.permissions,
        expiresAt: data.expiresAt
          ? typeof data.expiresAt === "string"
            ? data.expiresAt
            : data.expiresAt.toISOString()
          : undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onUpdateAPIKeys([...apiKeys, newAPIKey]);
      setNewKey(apiKey);
      reset();

      toast({
        title: "API Key Created",
        description: "Your new API key has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const success = await SecurityAPIKeyManager.revokeAPIKey(keyId);

      if (success) {
        const updatedKeys = apiKeys.map((key) =>
          key.id === keyId ? { ...key, isActive: false } : key,
        );
        onUpdateAPIKeys(updatedKeys);

        toast({
          title: "API Key Revoked",
          description:
            "The API key has been deactivated and can no longer be used.",
        });
      }
    } catch (error) {
      toast({
        title: "Revocation Failed",
        description: "Failed to revoke API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied",
      description: "API key copied to clipboard.",
    });
  };

  const handlePermissionToggle = (permission: string) => {
    const current = selectedPermissions;
    const updated = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];
    setValue("permissions", updated, { shouldValidate: true });
  };

  const isKeyExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isKeyExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </span>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Generate a new API key for programmatic access to your
                  account.
                </DialogDescription>
              </DialogHeader>

              {newKey ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>API Key Created Successfully!</strong>
                      <br />
                      Copy your API key now. For security reasons, you won't be
                      able to see it again.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Your New API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newKey}
                        readOnly
                        className="font-mono text-sm"
                        type={showFullKey === newKey ? "text" : "password"}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowFullKey(showFullKey === newKey ? null : newKey)
                        }
                      >
                        {showFullKey === newKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyKey(newKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit(handleCreateAPIKey)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="My API Key"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="What will this API key be used for?"
                      {...register("description")}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">
                      Expiration Date (Optional)
                    </Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      {...register("expiresAt")}
                    />
                    {errors.expiresAt && (
                      <p className="text-sm text-destructive">
                        {errors.expiresAt.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Permissions *</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {PERMISSION_OPTIONS.map((permission) => (
                        <div
                          key={permission.value}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPermissions.includes(permission.value)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}
                          onClick={() =>
                            handlePermissionToggle(permission.value)
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">
                                {permission.label}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                            <div
                              className={`w-4 h-4 border-2 rounded ${
                                selectedPermissions.includes(permission.value)
                                  ? "border-primary bg-primary"
                                  : "border-border"
                              }`}
                            >
                              {selectedPermissions.includes(
                                permission.value,
                              ) && (
                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.permissions && (
                      <p className="text-sm text-destructive">
                        {errors.permissions.message}
                      </p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!isValid || isCreating}>
                      {isCreating ? "Creating..." : "Create API Key"}
                    </Button>
                  </DialogFooter>
                </form>
              )}

              {newKey && (
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setNewKey(null);
                      setShowCreateDialog(false);
                    }}
                  >
                    Close
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Manage API keys for programmatic access to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys created yet</p>
              <p className="text-sm">
                Create your first API key to get started
              </p>
            </div>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className="p-4 bg-muted/50 rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{key.name}</h4>
                      <Badge
                        className={
                          !key.isActive
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            : isKeyExpired(key.expiresAt)
                              ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              : isKeyExpiringSoon(key.expiresAt)
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        }
                      >
                        {!key.isActive
                          ? "Revoked"
                          : isKeyExpired(key.expiresAt)
                            ? "Expired"
                            : isKeyExpiringSoon(key.expiresAt)
                              ? "Expires Soon"
                              : "Active"}
                      </Badge>
                    </div>

                    {key.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {key.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <span className="font-mono">Key: {key.keyPreview}</span>
                      {key.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Last used:{" "}
                          {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                      {key.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires:{" "}
                          {new Date(key.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {key.permissions.map((permission) => (
                        <Badge
                          key={permission}
                          variant="outline"
                          className="text-xs"
                        >
                          {PERMISSION_OPTIONS.find(
                            (p) => p.value === permission,
                          )?.label || permission}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyKey(key.keyPreview)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {key.isActive && !isKeyExpired(key.expiresAt) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {isKeyExpiringSoon(key.expiresAt) &&
                  !isKeyExpired(key.expiresAt) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This API key will expire soon. Consider creating a new
                        one or extending the expiration date.
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
