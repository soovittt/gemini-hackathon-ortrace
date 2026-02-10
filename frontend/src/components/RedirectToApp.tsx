import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { appUrl } from "@/lib/domain";

/** Full-page redirect to the app subdomain (e.g. app.ortrace.com) when user hits an app path on the landing domain. */
export function RedirectToApp() {
  const location = useLocation();

  useEffect(() => {
    const url = appUrl(location.pathname + location.search + location.hash);
    window.location.replace(url);
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <p className="text-sm text-muted-foreground">Redirecting to app…</p>
    </div>
  );
}
