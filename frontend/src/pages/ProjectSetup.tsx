import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { projectsApi, Project } from "@/lib/api";
import AnalysisQuestionsEditor from "@/components/AnalysisQuestionsEditor";
import { AnalysisQuestions, defaultAnalysisQuestions } from "@/lib/analysisQuestions";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Globe,
  Copy,
  Check,
  Trash2,
  Loader2,
  Save,
  Code,
  ExternalLink,
} from "lucide-react";

const ProjectSetup = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [requireAuth, setRequireAuth] = useState(false);
  const [analysisQuestions, setAnalysisQuestions] = useState<AnalysisQuestions>(defaultAnalysisQuestions());

  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const loadProject = async () => {
      try {
        const data = await projectsApi.get(projectId);
        setProject(data);
        setName(data.name);
        setDomain(data.domain || "");
        setIsActive(data.is_active);
        setRequireAuth(data.require_auth);
        setAnalysisQuestions(data.analysis_questions || defaultAnalysisQuestions());
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load project";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        navigate("/tickets");
      } finally {
        setIsLoading(false);
      }
    };
    loadProject();
  }, [projectId, navigate, toast]);

  const handleSave = async () => {
    if (!projectId || !name.trim()) return;
    setIsSaving(true);
    try {
      // Send all fields explicitly so the backend gets the full state (no omitted keys)
      const payload = {
        name: name.trim(),
        domain: domain.trim() || null,
        is_active: isActive,
        require_auth: requireAuth,
        analysis_questions: analysisQuestions,
      };
      const updated = await projectsApi.update(projectId, payload);
      setProject(updated);
      // Sync form state from server response so we display what was actually saved
      setName(updated.name);
      setDomain(updated.domain ?? "");
      setIsActive(updated.is_active);
      setRequireAuth(updated.require_auth);
      setAnalysisQuestions(updated.analysis_questions ?? defaultAnalysisQuestions());
      toast({ title: "Project Updated", description: "Your changes have been saved" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save changes";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleCopySnippet = async () => {
    if (!project) return;
    const snippet = getWidgetSnippet();
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
      toast({ title: "Copied", description: "Widget snippet copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    try {
      await projectsApi.delete(projectId);
      toast({ title: "Project Deleted" });
      navigate("/tickets");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete project";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const getWidgetSnippet = () => {
    return `<!-- Ortrace Feedback Widget -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${window.location.origin}/widget.js';
    document.head.appendChild(s);
  })();
</script>`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate("/tickets")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>

          <h1 className="mb-6 text-3xl font-bold text-foreground">Project Settings</h1>

          {/* General Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Project Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Website" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Domain</label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                />
                <p className="text-xs text-muted-foreground">
                  The website domain where the feedback widget will be installed
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Require User Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, users are assumed to be logged into your app. The widget won't ask for name or email — identity is inferred from their session.
                  </p>
                </div>
                <Switch checked={requireAuth} onCheckedChange={setRequireAuth} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Active</p>
                  <p className="text-sm text-muted-foreground">Enable or disable this project</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>AI Analysis Questions</CardTitle>
              <CardDescription>
                Configure the questions the AI should answer for each feedback type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalysisQuestionsEditor value={analysisQuestions} onChange={setAnalysisQuestions} />
            </CardContent>
          </Card>

          {/* Widget Installation */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Widget Installation
              </CardTitle>
              <CardDescription>
                Add this snippet to your website — the widget automatically connects to this project based on the domain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg bg-secondary p-4 text-sm text-foreground">
                  <code>{getWidgetSnippet()}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={handleCopySnippet}
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="mr-1 h-3 w-3 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Place this snippet before the closing <code>&lt;/body&gt;</code> tag on every page where you
                want the feedback widget to appear.
              </p>
              <Separator />
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Test Widget</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Preview how the feedback widget will appear on your website
                  </p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() =>
                    window.open(`${window.location.origin}/dummy`, "_blank")
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Demo Page
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Delete Project</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this project and all associated tickets
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? All associated tickets and feedback
              data will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectSetup;
