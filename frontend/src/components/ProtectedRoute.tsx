import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireInternal?: boolean;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireInternal = false,
  requireOnboarding = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Check for internal role requirement
  if (requireInternal && user?.role !== 'internal') {
    return <Navigate to="/overview" replace />;
  }

  // Check for onboarding requirement (customers only)
  if (requireOnboarding && user?.role === 'customer' && !user?.onboarding_completed) {
    return <Navigate to={`/onboarding?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
