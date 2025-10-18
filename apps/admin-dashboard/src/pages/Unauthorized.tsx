import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-subtle p-6 text-center space-y-6">
      <div className="space-y-4 max-w-md">
        <h1 className="text-4xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This area is restricted to internal Blunari staff (Admin / Support / Ops). Your account is a tenant account and cannot access the internal administration console.
        </p>
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          If you believe this is an error, contact support with your account email.
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            Return to Sign In
          </Link>
          <a href="https://blunari.ai" className="text-xs text-muted-foreground hover:text-foreground underline">
            Visit Marketing Site
          </a>
        </div>
      </div>
    </div>
  );
}
