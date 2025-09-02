import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function StaffInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    verifyInvitation();
  }, [token, verifyInvitation]);

  const verifyInvitation = async () => {
    try {
      setLoading(true);

      // Verify invitation token and get employee info
      const { data: invitationData, error: invitationError } = await supabase
        .from("staff_invitations")
        .select("*")
        .eq("invitation_token", token)
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString())
        .single();

      if (invitationError || !invitationData) {
        setError("Invalid or expired invitation");
        return;
      }

      // Get employee details separately
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("employee_id, role, first_name, last_name")
        .eq("employee_id", invitationData.employee_id)
        .single();

      if (employeeError) {
        console.warn("Could not fetch employee details:", employeeError);
      }

      // Combine invitation and employee data
      const combinedData = {
        ...invitationData,
        employee: employeeData,
      };

      setInvitation(combinedData);

      // Pre-fill form if we have employee data
      if (employeeData?.first_name || employeeData?.last_name) {
        setFormData((prev) => ({
          ...prev,
          firstName: employeeData.first_name || "",
          lastName: employeeData.last_name || "",
        }));
      }
    } catch (err: any) {
      setError("Failed to verify invitation");
      console.error("Invitation verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create user account
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: invitation.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error("Failed to create user account");
      }

      // Update employee record with user_id
      const { error: updateError } = await supabase
        .from("employees")
        .update({
          user_id: signUpData.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          status: "ACTIVE",
        })
        .eq("employee_id", invitation.employee_id);

      if (updateError) {
        console.error("Failed to update employee record:", updateError);
      }

      // Mark invitation as accepted
      const { error: invitationUpdateError } = await supabase
        .from("staff_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("invitation_token", token);

      if (invitationUpdateError) {
        console.error(
          "Failed to update invitation status:",
          invitationUpdateError,
        );
      }

      toast({
        title: "Success!",
        description:
          "Your account has been created successfully. Please check your email to verify your account.",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (err: any) {
      console.error("Account creation error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Verifying invitation...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
          <CardTitle>Join Our Staff</CardTitle>
          <CardDescription>
            Complete your registration to join as{" "}
            {invitation?.employee?.role || "Staff Member"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert className="mb-6">
            <AlertDescription>
              You're being invited to join with the email:{" "}
              <strong>{invitation?.email}</strong>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
