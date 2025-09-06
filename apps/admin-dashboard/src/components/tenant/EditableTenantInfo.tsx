import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Save, X, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminAPI } from "@/hooks/useAdminAPI";
import type { TenantData } from "@/types/admin";

interface EditableTenantInfoProps {
  tenant: TenantData;
  onUpdate: (updatedTenant: TenantData) => void;
}

interface EditableFieldProps {
  label: string;
  value: string;
  name: string;
  type?: "text" | "email" | "tel" | "textarea" | "select";
  options?: Array<{ value: string; label: string }>;
  icon?: React.ReactNode;
  editable?: boolean;
  onUpdate: (name: string, value: string) => void;
}

const EditableField = ({ 
  label, 
  value, 
  name, 
  type = "text", 
  options, 
  icon, 
  editable = true,
  onUpdate 
}: EditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onUpdate(name, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const renderValue = () => {
    if (type === "textarea") {
      return <p className="text-foreground whitespace-pre-wrap">{value || "-"}</p>;
    }
    
    if (icon) {
      return (
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-foreground">{value || "-"}</p>
        </div>
      );
    }
    
    return <p className="text-foreground">{value || "-"}</p>;
  };

  const renderEditor = () => {
    if (type === "textarea") {
      return (
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="min-h-[80px]"
        />
      );
    }
    
    if (type === "select" && options) {
      return (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <Input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
      />
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
        {label}
        {editable && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}
      </label>
      
      {isEditing ? (
        <div className="space-y-2">
          {renderEditor()}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        renderValue()
      )}
    </div>
  );
};

// Common timezone options
const timezoneOptions = [
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "UTC", label: "UTC" },
];

// Common currency options
const currencyOptions = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
];

export function EditableTenantInfo({ tenant, onUpdate }: EditableTenantInfoProps) {
  const { updateTenant } = useAdminAPI();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleFieldUpdate = async (fieldName: string, value: string) => {
    try {
      setIsUpdating(true);
      const updatedTenant = await updateTenant(tenant.id, {
        [fieldName]: value || null,
      });
      onUpdate(updatedTenant);
      toast({
        title: "Tenant Updated",
        description: `${fieldName} has been updated successfully.`,
      });
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update tenant",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField
            label="Restaurant Name"
            value={tenant.name}
            name="name"
            onUpdate={handleFieldUpdate}
          />

          <EditableField
            label="Slug"
            value={tenant.slug}
            name="slug"
            editable={false} // Slug should not be editable as it affects URLs
            onUpdate={() => {}} // No-op for non-editable field
          />

          <EditableField
            label="Timezone"
            value={tenant.timezone}
            name="timezone"
            type="select"
            options={timezoneOptions}
            onUpdate={handleFieldUpdate}
          />

          <EditableField
            label="Currency"
            value={tenant.currency}
            name="currency"
            type="select"
            options={currencyOptions}
            onUpdate={handleFieldUpdate}
          />

          <EditableField
            label="Email"
            value={tenant.email || ""}
            name="email"
            type="email"
            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            onUpdate={handleFieldUpdate}
          />

          <EditableField
            label="Phone"
            value={tenant.phone || ""}
            name="phone"
            type="tel"
            icon={<Phone className="h-4 w-4 text-muted-foreground" />}
            onUpdate={handleFieldUpdate}
          />

          <EditableField
            label="Website"
            value={tenant.website || ""}
            name="website"
            type="text"
            onUpdate={handleFieldUpdate}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Created
            </label>
            <p className="text-foreground">
              {tenant.created_at
                ? new Date(tenant.created_at).toLocaleString()
                : "-"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Last Updated
            </label>
            <p className="text-foreground">
              {tenant.updated_at
                ? new Date(tenant.updated_at).toLocaleString()
                : "-"}
            </p>
          </div>
        </div>

        <EditableField
          label="Description"
          value={tenant.description || ""}
          name="description"
          type="textarea"
          onUpdate={handleFieldUpdate}
        />

        {isUpdating && (
          <div className="text-sm text-muted-foreground">
            Updating tenant information...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
