import { useState, useMemo, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ticketsApi, projectsApi, TicketListItem, Project } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Users,
  AlertTriangle,
  TrendingUp,
  Bug,
  AlertCircle,
  Lightbulb,
  Loader2,
  FolderOpen,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type TimeRange = "1d" | "1w" | "1m" | "1y";

const Dashboard = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("1m");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, ticketsData] = await Promise.all([
          projectsApi.list(),
          ticketsApi.list({ per_page: 100 }),
        ]);
        setProjects(projectsData);
        setTickets(ticketsData.items);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const timeRangeLabels: Record<TimeRange, string> = {
    "1d": "1D",
    "1w": "1W",
    "1m": "1M",
    "1y": "1Y",
  };

  // Compute stats from real data
  const stats = useMemo(() => {
    const bugs = tickets.filter((t) => t.feedback_type === "bug").length;
    const feedback = tickets.filter((t) => t.feedback_type === "feedback").length;
    const ideas = tickets.filter((t) => t.feedback_type === "idea").length;
    return {
      totalProjects: projects.length,
      totalTickets: tickets.length,
      totalBugs: bugs,
      totalFeedback: feedback,
      totalIdeas: ideas,
    };
  }, [projects, tickets]);

  const pieData = useMemo(
    () => [
      { name: "Bugs", value: stats.totalBugs, color: "hsl(var(--destructive))" },
      { name: "Feedback", value: stats.totalFeedback, color: "hsl(var(--primary))" },
      { name: "Ideas", value: stats.totalIdeas, color: "hsl(48 96% 53%)" },
    ],
    [stats]
  );

  const severityData = useMemo(() => {
    // Build from tickets' priority
    const urgent = tickets.filter((t) => t.priority === "urgent").length;
    const high = tickets.filter((t) => t.priority === "high").length;
    const neutral = tickets.filter((t) => t.priority === "neutral").length;
    const low = tickets.filter((t) => t.priority === "low").length;
    return [
      { name: "Urgent", value: urgent, fill: "hsl(var(--destructive))" },
      { name: "High", value: high, fill: "hsl(48 96% 53%)" },
      { name: "Neutral", value: neutral, fill: "hsl(var(--primary))" },
      { name: "Low", value: low, fill: "hsl(var(--muted-foreground))" },
    ];
  }, [tickets]);

  // Build issue-over-time chart data from tickets grouped by date
  const issuesOverTime = useMemo(() => {
    const dateMap = new Map<string, { bugs: number; feedback: number; ideas: number }>();
    tickets.forEach((t) => {
      const date = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const current = dateMap.get(date) || { bugs: 0, feedback: 0, ideas: 0 };
      if (t.feedback_type === "bug") current.bugs++;
      else if (t.feedback_type === "feedback") current.feedback++;
      else if (t.feedback_type === "idea") current.ideas++;
      dateMap.set(date, current);
    });
    return Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  }, [tickets]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return tickets.slice(0, 5).map((t) => ({
      name: t.task_description || "Untitled",
      user: t.customer_name || t.submitter_name || "Anonymous",
      date: new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      type: t.feedback_type,
      issues: t.issues_count,
    }));
  }, [tickets]);

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
      <main className="flex-1 py-12">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="mt-1 text-muted-foreground">
                Aggregate insights across all your projects
              </p>
            </div>

            {/* Time range filter */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className={`min-w-[40px] font-medium ${
                    timeRange === range
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {timeRangeLabels[range]}
                </Button>
              ))}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Projects</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalProjects}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-3">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tickets</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalTickets}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bugs</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalBugs}</p>
                  </div>
                  <div className="rounded-full bg-destructive/10 p-3">
                    <Bug className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ideas</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalIdeas}</p>
                  </div>
                  <div className="rounded-full bg-yellow-500/10 p-3">
                    <Lightbulb className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* Issues Over Time */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Tickets Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {issuesOverTime.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={issuesOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="bugs" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Bugs" />
                        <Line type="monotone" dataKey="feedback" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Feedback" />
                        <Line type="monotone" dataKey="ideas" stroke="hsl(48 96% 53%)" strokeWidth={2} dot={false} name="Ideas" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Type Distribution */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {tickets.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Priority Distribution */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {tickets.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-muted-foreground">
                    No activity yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            {activity.type === "bug" ? (
                              <Bug className="h-5 w-5 text-destructive" />
                            ) : activity.type === "idea" ? (
                              <Lightbulb className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground truncate max-w-[200px]">{activity.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {activity.user} · {activity.date}
                            </p>
                          </div>
                        </div>
                        {activity.issues > 0 && (
                          <Badge variant="secondary">{activity.issues} issues</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
