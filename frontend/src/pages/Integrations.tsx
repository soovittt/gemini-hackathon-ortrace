import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink, Info, Plus, ChevronDown, ChevronUp, Settings, Unplug } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Integration {
  id: string;
  name: string;
  logo: string;
  description: string;
  connected: boolean;
  projectName?: string;
}

const connectedIntegration: Integration = {
  id: "github",
  name: "GitHub Issues",
  logo: "https://cdn.worldvectorlogo.com/logos/github-icon-1.svg",
  description: "With Projects & Milestones",
  connected: true,
  projectName: "acme/feedback-platform",
};

const availableIntegrations: Integration[] = [
  {
    id: "jira",
    name: "Jira",
    logo: "https://cdn.worldvectorlogo.com/logos/jira-1.svg",
    description: "Atlassian's project tracking tool",
    connected: false,
  },
  {
    id: "gitlab",
    name: "GitLab Issues & Boards",
    logo: "https://cdn.worldvectorlogo.com/logos/gitlab.svg",
    description: "GitLab's integrated issue tracking",
    connected: false,
  },
  {
    id: "azure",
    name: "Azure DevOps Boards",
    logo: "https://cdn.worldvectorlogo.com/logos/azure-devops.svg",
    description: "Microsoft's agile planning tool",
    connected: false,
  },
  {
    id: "linear",
    name: "Linear",
    logo: "https://linear.app/static/apple-touch-icon.png",
    description: "Modern issue tracking",
    connected: false,
  },
  {
    id: "clickup",
    name: "ClickUp",
    logo: "https://clickup.com/images/clickup-logo-gradient.png",
    description: "With Agile views",
    connected: false,
  },
  {
    id: "shortcut",
    name: "Shortcut",
    logo: "https://images.ctfassets.net/zsv3d0ugroxu/7HkhC79NAPKY7GHWQ4WS2u/f1f1f2b25c85bd0b67c0a0f3f04aa428/Shortcut-logomark-purple.svg",
    description: "Formerly Clubhouse",
    connected: false,
  },
  {
    id: "youtrack",
    name: "YouTrack",
    logo: "https://resources.jetbrains.com/storage/products/youtrack/img/meta/youtrack_logo_300x300.png",
    description: "JetBrains issue tracker",
    connected: false,
  },
];

const Connect = () => {
  const [showAllApps, setShowAllApps] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Connect</h1>
            <p className="mt-1 text-muted-foreground">
              Connect your project management tools to export issues directly
            </p>
          </div>

          {/* Connected Integration - GitHub */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Connected
            </h2>
            <Card className="border-primary/30 bg-card shadow-lg ring-2 ring-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary p-3 shadow-sm">
                    <img
                      src={connectedIntegration.logo}
                      alt={`${connectedIntegration.name} logo`}
                      className="h-10 w-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-semibold text-foreground">{connectedIntegration.name}</h3>
                      <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                        <Check className="h-3 w-3" />
                        Connected
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{connectedIntegration.description}</p>
                    <p className="mt-2 text-sm font-medium text-primary flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {connectedIntegration.projectName}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 border-t border-border pt-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Unplug className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connect Other Apps */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => setShowAllApps(!showAllApps)}
              className="w-full justify-between gap-2 h-12 text-base"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Connect Other Apps
              </div>
              {showAllApps ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>

            {showAllApps && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 animate-fade-in">
                {availableIntegrations.map((integration) => (
                  <Card
                    key={integration.id}
                    className="border-border bg-card/50 hover:bg-card hover:shadow-md transition-all cursor-pointer group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary p-2 group-hover:scale-105 transition-transform">
                          <img
                            src={integration.logo}
                            alt={`${integration.name} logo`}
                            className="h-6 w-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">{integration.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{integration.description}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          Connect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* API Settings Section */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure global settings for your connected integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <h4 className="font-medium text-foreground">Default Export Behavior</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose how issues are formatted when exporting
                      </p>
                    </div>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-sm max-w-xs">Determines the markdown format and fields included when issues are exported to your PM tool</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Badge variant="outline">Engineering Format</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <h4 className="font-medium text-foreground">Auto-attach Screenshots</h4>
                      <p className="text-sm text-muted-foreground">
                        Include screenshots when creating issues
                      </p>
                    </div>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-sm max-w-xs">Automatically upload and attach session screenshots to exported issues for visual context</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <h4 className="font-medium text-foreground">Webhook URL</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for new issues
                      </p>
                    </div>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-sm max-w-xs">Configure a webhook endpoint to receive real-time notifications when new issues are created</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Connect;
