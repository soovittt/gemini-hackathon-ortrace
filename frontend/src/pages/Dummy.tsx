import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import FeedbackWidget from "@/components/FeedbackWidget";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Clock,
  ArrowUpRight,
  Zap,
  TrendingUp,
  Calendar,
  ChevronDown,
  Star,
} from "lucide-react";

// Mock data for the SaaS app
const mockTasks = [
  { id: 1, title: "Redesign onboarding flow", status: "done", priority: "high", assignee: "SM", dueDate: "Feb 10", tags: ["Design", "UX"] },
  { id: 2, title: "Implement payment gateway integration", status: "in_progress", priority: "urgent", assignee: "AK", dueDate: "Feb 12", tags: ["Backend", "Payments"] },
  { id: 3, title: "Write API documentation for v2 endpoints", status: "in_progress", priority: "medium", assignee: "JL", dueDate: "Feb 14", tags: ["Docs"] },
  { id: 4, title: "Set up CI/CD pipeline for staging", status: "todo", priority: "high", assignee: "RN", dueDate: "Feb 15", tags: ["DevOps"] },
  { id: 5, title: "User research interviews — Batch 3", status: "todo", priority: "medium", assignee: "SM", dueDate: "Feb 18", tags: ["Research", "UX"] },
  { id: 6, title: "Fix mobile nav menu z-index issue", status: "in_progress", priority: "low", assignee: "AK", dueDate: "Feb 11", tags: ["Bug", "Frontend"] },
  { id: 7, title: "Migrate database to new cluster", status: "todo", priority: "urgent", assignee: "RN", dueDate: "Feb 20", tags: ["Backend", "DevOps"] },
  { id: 8, title: "A/B test pricing page variants", status: "done", priority: "medium", assignee: "JL", dueDate: "Feb 8", tags: ["Growth"] },
];

const mockTeam = [
  { name: "Sarah Mitchell", role: "Product Lead", avatar: "SM", status: "online" },
  { name: "Arun Kumar", role: "Senior Engineer", avatar: "AK", status: "online" },
  { name: "Jamie Lawson", role: "Designer", avatar: "JL", status: "away" },
  { name: "Riley Nguyen", role: "DevOps", avatar: "RN", status: "offline" },
];

const Dummy = () => {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [searchValue, setSearchValue] = useState("");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: "bg-red-500/10 text-red-500 border-red-500/20",
      high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };
    return (
      <Badge variant="outline" className={`text-[10px] ${styles[priority] || ""}`}>
        {priority}
      </Badge>
    );
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "team", label: "Team", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Flowboard</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeNav === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Team */}
        <div className="border-t border-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team</p>
          <div className="space-y-2">
            {mockTeam.map((member) => (
              <div key={member.name} className="flex items-center gap-2.5">
                <div className="relative">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-secondary">{member.avatar}</AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                      member.status === "online"
                        ? "bg-green-500"
                        : member.status === "away"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{member.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" />
              <AvatarFallback>AP</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">Alex Park</p>
              <p className="truncate text-xs text-muted-foreground">alex@flowboard.io</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-4">
            {/* Mobile brand */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">Flowboard</span>
            </div>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks, projects..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-72 pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Task
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Welcome & Stats */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Good afternoon, Alex</h1>
            <p className="text-muted-foreground">Here's what's happening across your projects today.</p>
          </div>

          {/* Stats Row */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active Tasks", value: "24", change: "+3 this week", icon: FolderKanban, color: "text-primary" },
              { label: "Completed", value: "156", change: "+12 this month", icon: CheckCircle2, color: "text-green-500" },
              { label: "Team Velocity", value: "94%", change: "+5% vs last sprint", icon: TrendingUp, color: "text-yellow-500" },
              { label: "Upcoming Deadlines", value: "7", change: "Next 7 days", icon: Calendar, color: "text-orange-500" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-center justify-between">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Task List */}
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Current Sprint</h2>
                  <Badge variant="outline">Sprint 14</Badge>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  View board
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-2">
                {mockTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-accent/30 cursor-pointer"
                  >
                    {getStatusIcon(task.status)}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="hidden items-center gap-3 sm:flex">
                      {getPriorityBadge(task.priority)}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{task.dueDate}</span>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px] bg-secondary">{task.assignee}</AvatarFallback>
                      </Avatar>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Sprint Progress */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">Sprint Progress</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium text-foreground">18 / 24</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <p className="text-xs text-muted-foreground">5 days remaining in sprint</p>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2.5">
                  {[
                    { label: "Done", count: 18, color: "bg-green-500" },
                    { label: "In Progress", count: 4, color: "bg-yellow-500" },
                    { label: "To Do", count: 2, color: "bg-muted" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <div className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-foreground">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
                <div className="mt-4 space-y-4">
                  {[
                    { user: "AK", action: "completed", target: "Payment gateway integration", time: "2m ago" },
                    { user: "SM", action: "commented on", target: "Onboarding flow", time: "15m ago" },
                    { user: "JL", action: "attached files to", target: "Design system update", time: "1h ago" },
                    { user: "RN", action: "created", target: "Database migration plan", time: "3h ago" },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Avatar className="mt-0.5 h-6 w-6">
                        <AvatarFallback className="text-[9px] bg-secondary">{activity.user}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground">
                          <span className="font-medium">{activity.user}</span>{" "}
                          <span className="text-muted-foreground">{activity.action}</span>{" "}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Starred Projects */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">Starred Projects</h3>
                <div className="mt-4 space-y-2.5">
                  {[
                    { name: "Platform v2.0", progress: 72, tasks: 34 },
                    { name: "Mobile App", progress: 45, tasks: 18 },
                    { name: "Marketing Site", progress: 90, tasks: 12 },
                  ].map((project) => (
                    <div
                      key={project.name}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50 cursor-pointer"
                    >
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={project.progress} className="h-1 flex-1" />
                          <span className="text-[10px] text-muted-foreground">{project.progress}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{project.tasks}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Ortrace Feedback Widget — auto-detects project by domain */}
      <FeedbackWidget />
    </div>
  );
};

export default Dummy;
