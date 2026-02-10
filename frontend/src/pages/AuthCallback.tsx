import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * OAuth redirect callback page. The backend redirects here with tokens in the hash:
 * /auth/callback#access_token=...&refresh_token=...&expires_in=...
 * We parse the fragment, store tokens, fetch user, then redirect to app.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { completeOAuthRedirect } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      // Backend may redirect with ?error=... (e.g. /auth/callback?error=exchange_failed)
      const queryParams = new URLSearchParams(window.location.search);
      const queryError = queryParams.get("error");
      if (queryError) {
        setError(queryError === "access_denied" ? "Sign in was cancelled." : `Sign in failed. ${queryError}`);
        return;
      }

      const hash = window.location.hash?.slice(1) || "";
      const params = new URLSearchParams(hash);

      const err = params.get("error");
      if (err) {
        setError(err === "access_denied" ? "Sign in was cancelled." : `Sign in failed. ${err}`);
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) {
        setError("Invalid sign-in response. Please try again.");
        return;
      }

      try {
        const user = await completeOAuthRedirect(accessToken, refreshToken);
        if (user.onboarding_completed) {
          navigate("/overview", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      } catch {
        setError("Failed to complete sign-in. Please try again.");
      }
    };

    run();
  }, [completeOAuthRedirect, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <p className="font-semibold text-foreground">Sign in failed</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/auth", { replace: true })}
            className="text-primary hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
