import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SecureForm } from "@/components/security/SecureForm";
import { InputSanitizer } from "@/lib/security/inputSanitizer";
import { Mail, Loader2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface InviteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onInviteSent: () => void;
}

export const InviteEmployeeDialog = ({
  open,
  onOpenChange,
  departments,
  onInviteSent,
}: InviteEmployeeDialogProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const departmentId = formData.get("department_id") as string;

    // Additional validation and sanitization
    const sanitizedEmail = InputSanitizer.sanitizeEmail(email);
    if (!sanitizedEmail) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!role) {
      toast.error("Please select a role");
      return;
    }

    setLoading(true);
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      // Call edge function to send invitation
      const { data, error } = await supabase.functions.invoke("invite-staff", {
        body: {
          email: sanitizedEmail,
          role,
          department_id: departmentId || null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to send invitation");
      }

      if (data?.error) {
        // Handle application-level errors
        const errorMsg = data.message || data.error;
        toast.error(errorMsg);
        return;
      }

      if (data?.success) {
        toast.success(
          data.message || "Employee invitation sent successfully",
          {
            description: `Invitation link: ${data.invitation?.email}`,
          }
        );
        
        // Log the invitation link for development (remove in production with real email)
        console.log("[InviteEmployee] Invitation link:", data.invitation?.invitation_link);
        
        onInviteSent();
        onOpenChange(false);
        setEmail("");
        setRole("");
        setDepartmentId("");
      } else {
        toast.error("Unexpected response from server");
      }
    } catch (error: any) {
      console.error("Error inviting employee:", error);
      toast.error(error?.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invite New Employee
          </DialogTitle>
        </DialogHeader>

        <SecureForm
          onSubmit={handleFormSubmit}
          action="invite_employee"
          rateLimit={{ limit: 5, windowMinutes: 10 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Viewer</SelectItem>
                <SelectItem value="OPS">Operations</SelectItem>
                <SelectItem value="SUPPORT">Support</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="role" value={role} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department (optional)" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="department_id" value={departmentId} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send Invitation
            </Button>
          </div>
        </SecureForm>
      </DialogContent>
    </Dialog>
  );
};
