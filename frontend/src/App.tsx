import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RedirectToApp } from "@/components/RedirectToApp";
import { isLandingDomain } from "@/lib/domain";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Overview from "./pages/Overview";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import ProjectSetup from "./pages/ProjectSetup";
import Analytics from "./pages/Analytics";
import Integrations from "./pages/Integrations";
import Dummy from "./pages/Dummy";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** On landing domain (ortrace.com): only /, /privacy, /terms. Any other path redirects to app subdomain. */
function LandingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<RedirectToApp />} />
    </Routes>
  );
}

/** On app domain (app.ortrace.com): full app. Root / redirects to /overview; on localhost show Landing at / for easier dev. */
function AppRoutes() {
  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
  return (
    <Routes>
      <Route path="/" element={isLocalhost ? <Landing /> : <Navigate to="/overview" replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireAuth requireOnboarding={false}>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/overview"
        element={
          <ProtectedRoute requireAuth requireOnboarding>
            <Overview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/project/:projectId"
        element={
          <ProtectedRoute requireAuth requireInternal>
            <Tickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute requireAuth requireInternal>
            <Tickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/:ticketId"
        element={
          <ProtectedRoute requireAuth>
            <TicketDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute requireAuth requireInternal>
            <ProjectSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute requireAuth requireInternal>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/integrations"
        element={
          <ProtectedRoute requireAuth requireInternal>
            <Integrations />
          </ProtectedRoute>
        }
      />
      <Route path="/dummy" element={<Dummy />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {isLandingDomain() ? <LandingRoutes /> : <AppRoutes />}
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
