import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, Database, BarChart3, Users } from "lucide-react";

const AdminLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <img 
            src="https://raw.githubusercontent.com/3sc0rp/Blunari/refs/heads/main/logo-bg.png" 
            alt="Blunari Admin"
            className="w-16 h-16 mx-auto rounded-lg"
          />
          <div>
            <h1 className="text-3xl font-bold">Blunari Admin</h1>
            <p className="text-muted-foreground">
              Restaurant Booking Platform Administration
            </p>
          </div>
        </div>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Management</CardTitle>
            <CardDescription>
              Comprehensive tools for managing your restaurant booking platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm">Tenant Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm">Analytics Dashboard</span>
              </div>
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-sm">System Monitoring</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm">Security Controls</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Administrator Access</CardTitle>
            <CardDescription>
              Sign in to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth">
              <Button className="w-full" size="lg">
                <Shield className="h-4 w-4 mr-2" />
                Access Admin Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 Blunari. Secure platform administration.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLanding;