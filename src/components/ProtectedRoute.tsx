import { useState, useEffect } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, profile, loading, adminUnlocked } = useAuth();
  const location = useLocation();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setShowFallback(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
        {showFallback && (
          <Link to="/auth">
            <Button variant="outline" size="sm">Taking too long? Go to login</Button>
          </Link>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin) {
    if (profile?.role !== "admin") {
      return <Navigate to="/dashboard" replace />;
    }
    if (!adminUnlocked) {
      return <Navigate to="/admin-login" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
}
