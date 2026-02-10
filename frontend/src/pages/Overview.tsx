import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { projectsApi, ticketsApi, Project, TicketListItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Bug,
  MessageSquare,
  Lightbulb,
  Loader2,
  ArrowRight,
  Globe,
  Users,
  FolderOpen,
  Settings,
} from "lucide-react";

const Overview = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketListItem[]>([]);
  const [stats, setStats] = useState({
    feedback: 0,
    bugs: 0,
    ideas: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    total: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, ticketsData] = await Promise.all([
          projectsApi.list(),
          ticketsApi.list({ per_page: 10 }),
        ]);

        setProjects(projectsData);

        const tickets = ticketsData.items;
        setRecentTickets(tickets);

        // Calculate stats from tickets
        const feedback = tickets.filter((t) => t.feedback_type === "feedback").length;
        const bugs = tickets.filter((t) => t.feedback_type === "bug").length;
        const ideas = tickets.filter((t) => t.feedback_type === "idea").length;
        const open = tickets.filter((t) => t.ticket_status === "open").length;
        const inProgress = tickets.filter((t) => t.ticket_status === "in_progress").length;
        const resolved = tickets.filter((t) => t.ticket_status === "resolved").length;

        setStats({
          feedback,
          bugs,
          ideas,
          open,
          in_progress: inProgress,
          resolved,
          total: ticketsData.total,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load overview data";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "bug":
        return (
          <Badge variant="outline" className="border-destructive/50 text-destructive gap-1">
            <Bug className="h-3 w-3" />
            Bug
          </Badge>
        );
      case "idea":
        return (
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 gap-1">
            <Lightbulb className="h-3 w-3" />
            Idea
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-primary/50 text-primary gap-1">
            <MessageSquare className="h-3 w-3" />
            Feedback
          </Badge>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-500/10 text-blue-500";
      case "in_progress":
        return "bg-yellow-500/10 text-yellow-500";
      case "resolved":
        return "bg-green-500/10 text-green-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const pct = (value: number) =>
    stats.total > 0 ? ((value / stats.total) * 100).toFixed(1) : "0.0";

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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Overview</h1>
            <p className="mt-1 text-muted-foreground">
              A summary of all feedback across your projects
            </p>
          </div>

          {/* Active Projects */}
          {projects.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Projects</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/tickets">
                    View all
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.slice(0, 3).map((project) => (
                  <Card
                    key={project.id}
                    className="group transition-colors hover:bg-accent/50 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Globe className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-foreground">
                            {project.name}
                          </h3>
                          <p className="truncate text-sm text-muted-foreground">
                            {project.domain || "No domain set"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {project.ticket_count} ticket{project.ticket_count !== 1 ? "s" : ""}
                        </span>
                        <Badge variant={project.is_active ? "default" : "secondary"}>
                          {project.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Impressions */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Feedback</p>
                    <p className="text-3xl font-bold text-foreground">{stats.feedback}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-3">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bugs</p>
                    <p className="text-3xl font-bold text-foreground">{stats.bugs}</p>
                  </div>
                  <div className="rounded-full bg-destructive/10 p-3">
                    <Bug className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ideas</p>
                    <p className="text-3xl font-bold text-foreground">{stats.ideas}</p>
                  </div>
                  <div className="rounded-full bg-yellow-500/10 p-3">
                    <Lightbulb className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Open", value: stats.open, color: "bg-blue-500" },
                    { label: "In Progress", value: stats.in_progress, color: "bg-yellow-500" },
                    { label: "Resolved", value: stats.resolved, color: "bg-green-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <span className="w-24 text-sm text-muted-foreground">{item.label}</span>
                      <div className="flex-1">
                        <div className="h-3 w-full rounded-full bg-secondary">
                          <div
                            className={`h-3 rounded-full ${item.color} transition-all`}
                            style={{
                              width: `${stats.total > 0 ? (item.value / stats.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-16 text-right text-sm font-medium text-foreground">
                        {item.value}{" "}
                        <span className="text-muted-foreground">{pct(item.value)}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Tickets + Assignees */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Tickets */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Tickets</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/tickets">
                        View all
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentTickets.length === 0 ? (
                    <div className="py-8 text-center">
                      <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">
                        No tickets yet. Integrate the widget on your website to start
                        collecting feedback.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentTickets.slice(0, 5).map((ticket) => (
                        <Link
                          key={ticket.id}
                          to={`/tickets/${ticket.id}`}
                          className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {getTypeBadge(ticket.feedback_type)}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {ticket.task_description || "Untitled feedback"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {ticket.customer_name || ticket.submitter_name || "Anonymous"} ·{" "}
                                {formatDate(ticket.created_at)}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(ticket.ticket_status)}>
                            {ticket.ticket_status.replace("_", " ")}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Assignees / Top Users */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No feedback submitted yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Deduplicate users from recent tickets */}
                      {Array.from(
                        new Map(
                          recentTickets
                            .filter((t) => t.customer_name || t.submitter_name)
                            .map((t) => [
                              t.customer_name || t.submitter_name,
                              {
                                name: t.customer_name || t.submitter_name || "Unknown",
                                email: t.submitter_email,
                              },
                            ])
                        ).values()
                      )
                        .slice(0, 5)
                        .map((user, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {user.name}
                              </p>
                              {user.email && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Overview;
